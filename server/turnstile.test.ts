import { describe, expect, it } from 'vitest'
import { turnstileVerifier } from './turnstile.js'

/** Stands in for Cloudflare's siteverify endpoint and records the form it was sent. */
function fakeSiteverify(respond: () => Response | Promise<Response>) {
  const sent: URLSearchParams[] = []
  const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
    sent.push(new URLSearchParams(init?.body as URLSearchParams))
    return respond()
  }) as typeof fetch
  return { sent, fetchImpl }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('turnstileVerifier', () => {
  it('passes when Cloudflare confirms the token, sending the secret, token and client IP', async () => {
    const { sent, fetchImpl } = fakeSiteverify(() => json({ success: true }))
    expect(await turnstileVerifier('secret-key', fetchImpl)('tok', '203.0.113.7')).toBe(true)
    expect(Object.fromEntries(sent[0])).toEqual({ secret: 'secret-key', response: 'tok', remoteip: '203.0.113.7' })
  })

  it('fails closed on a rejected token, an error status, or a network failure', async () => {
    const rejected = fakeSiteverify(() => json({ success: false, 'error-codes': ['invalid-input-response'] }))
    expect(await turnstileVerifier('s', rejected.fetchImpl)('tok', 'ip')).toBe(false)

    const serverError = fakeSiteverify(() => json({ success: true }, 500))
    expect(await turnstileVerifier('s', serverError.fetchImpl)('tok', 'ip')).toBe(false)

    const offline = fakeSiteverify(() => { throw new TypeError('fetch failed') })
    expect(await turnstileVerifier('s', offline.fetchImpl)('tok', 'ip')).toBe(false)
  })

  it('fails without calling Cloudflare when there is no token', async () => {
    const { sent, fetchImpl } = fakeSiteverify(() => json({ success: true }))
    expect(await turnstileVerifier('s', fetchImpl)(undefined, 'ip')).toBe(false)
    expect(await turnstileVerifier('s', fetchImpl)('', 'ip')).toBe(false)
    expect(sent).toHaveLength(0)
  })
})
