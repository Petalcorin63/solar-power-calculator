import { randomBytes, scryptSync } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_SESSIONS_PER_USER,
  clientKey,
  createSession,
  hashPassword,
  hitRateLimit,
  needsRehash,
  userForSession,
  verifyPassword,
} from './auth.js'
import { openDb } from './db.js'

/** A hash in the original `scrypt$salt$key` format (N=2^14, no stored parameters). */
function legacyHash(password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 64, { N: 2 ** 14, r: 8, p: 1 })
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

describe('password hashing', () => {
  it('stores the cost parameters and verifies only the right password', async () => {
    const hash = await hashPassword('correct horse')
    expect(hash).toMatch(/^scrypt\$N=131072,r=8,p=1\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(await verifyPassword('wrong horse', hash)).toBe(false)
    expect(needsRehash(hash)).toBe(false)
  })

  it('still verifies legacy hashes and flags them for re-hashing', async () => {
    const hash = legacyHash('correct horse')
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(needsRehash(hash)).toBe(true)
  })

  it('rejects malformed or tampered hashes instead of running them', async () => {
    const salt = '00'.repeat(16)
    const key = '00'.repeat(64)
    // N=2^30 would need ~1 TB of memory; it must be refused, not attempted.
    expect(await verifyPassword('x', `scrypt$N=1073741824,r=8,p=1$${salt}$${key}`)).toBe(false)
    expect(await verifyPassword('x', `scrypt$N=abc$${salt}$${key}`)).toBe(false)
    expect(await verifyPassword('x', `bcrypt$${salt}$${key}`)).toBe(false)
    expect(await verifyPassword('x', '')).toBe(false)
  })
})

describe('sessions', () => {
  it(`keeps at most ${MAX_SESSIONS_PER_USER} sessions per user, ending the oldest`, async () => {
    const db = await openDb({ url: ':memory:' })
    await db.run("INSERT INTO users (id, email, password_hash) VALUES (1, 'a@example.com', 'x')")
    const first = (await createSession(db, 1)).token
    const rest = []
    for (let i = 0; i < MAX_SESSIONS_PER_USER; i++) rest.push((await createSession(db, 1)).token)

    expect(await userForSession(db, first)).toBeNull()
    expect(await userForSession(db, rest.at(-1))).toMatchObject({ id: 1 })
    expect(await db.get('SELECT COUNT(*) AS count FROM sessions')).toEqual({ count: MAX_SESSIONS_PER_USER })
  })

  it('clears expired sessions and rate-limit rows whenever a session is created', async () => {
    const db = await openDb({ url: ':memory:' })
    await db.run("INSERT INTO users (id, email, password_hash) VALUES (1, 'a@example.com', 'x')")
    await db.run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('old', 1, 1)")
    await db.run("INSERT INTO rate_limits (key, count, reset_at) VALUES ('stale', 3, 1)")

    await createSession(db, 1)
    expect(await db.get("SELECT 1 AS found FROM sessions WHERE token_hash = 'old'")).toBeUndefined()
    expect(await db.get("SELECT 1 AS found FROM rate_limits WHERE key = 'stale'")).toBeUndefined()
  })
})

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

    const results = []
    for (let i = 0; i < 4; i++) results.push(await hitRateLimit(db, 'k', rule))
    expect(results).toEqual([true, true, true, false])
    expect(await hitRateLimit(db, 'other', rule)).toBe(true)

    vi.advanceTimersByTime(60_001)
    expect(await hitRateLimit(db, 'k', rule)).toBe(true)
  })
})
