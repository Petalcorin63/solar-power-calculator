import { afterEach, describe, expect, it, vi } from 'vitest'
import { openDb } from '../db/index.js'
import { clientKey, hitRateLimit, refundRateLimit } from './rate-limit.js'

describe('clientKey', () => {
  it('keys IPv4 by address and unwraps IPv4-mapped IPv6', () => {
    expect(clientKey('203.0.113.7')).toBe('203.0.113.7')
    expect(clientKey('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })

  it('groups IPv6 addresses by /64 so one client cannot rotate through its range', () => {
    expect(clientKey('2001:db8:aa:1::1')).toBe('2001:db8:aa:1::/64')
    expect(clientKey('2001:0db8:00aa:0001:ffff:1:2:3')).toBe('2001:db8:aa:1::/64')
    expect(clientKey('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(clientKey('::1')).toBe('0:0:0:0::/64')
  })
})

describe('hitRateLimit', () => {
  afterEach(() => { vi.useRealTimers() })

  it('allows up to the limit per key, then blocks until the window resets', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const db = await openDb({ url: ':memory:' })
    const rule = { limit: 3, windowMs: 60_000 }

    const results: boolean[] = []
    for (let i = 0; i < 4; i++) results.push(await hitRateLimit(db, 'k', rule))
    expect(results).toEqual([true, true, true, false])
    expect(await hitRateLimit(db, 'other', rule)).toBe(true)

    vi.advanceTimersByTime(60_001)
    expect(await hitRateLimit(db, 'k', rule)).toBe(true)
  })

  it('gives a hit back when refunded, but never below zero', async () => {
    const db = await openDb({ url: ':memory:' })
    const rule = { limit: 1, windowMs: 60_000 }
    expect(await hitRateLimit(db, 'k', rule)).toBe(true)
    await refundRateLimit(db, 'k')
    expect(await hitRateLimit(db, 'k', rule)).toBe(true)
    await refundRateLimit(db, 'unknown')
    expect(await db.get("SELECT count FROM rate_limits WHERE key = 'unknown'")).toBeUndefined()
  })
})
