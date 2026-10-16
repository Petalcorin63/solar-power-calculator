/**
 * Cloudflare Turnstile server-side validation. Runs before any password hashing, so
 * bots that can't pass it never cost the server more than one HTTP call to Cloudflare.
 */
import { TURNSTILE_SITEVERIFY_URL, TURNSTILE_TIMEOUT_MS } from './constants.js'
import type { HumanCheck } from './types.js'

/** Fails closed: a missing token, a rejected token, or Cloudflare being unreachable all count as "not verified". */
export function turnstileVerifier(secretKey: string, fetchImpl: typeof fetch = fetch): HumanCheck {
  return async (token, ip) => {
    if (!token) return false
    try {
      const res = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
        method: 'POST',
        body: new URLSearchParams({ secret: secretKey, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
      })
      if (!res.ok) return false
      const result = await res.json() as { success?: unknown }
      return result.success === true
    } catch {
      return false
    }
  }
}
