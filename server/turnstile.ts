/**
 * Checks that a sign-in/sign-up request came from a person, given the token the
 * Turnstile widget produced in their browser. Runs before any password hashing, so
 * bots that can't pass it never cost the server more than one HTTP call to Cloudflare.
 */
export type HumanCheck = (token: string | undefined, ip: string) => Promise<boolean>

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Cloudflare Turnstile server-side validation. Fails closed: a missing token, a
 * rejected token, or Cloudflare being unreachable all count as "not verified".
 */
export function turnstileVerifier(secretKey: string, fetchImpl: typeof fetch = fetch): HumanCheck {
  return async (token, ip) => {
    if (!token) return false
    try {
      const res = await fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        body: new URLSearchParams({ secret: secretKey, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return false
      const result = await res.json() as { success?: unknown }
      return result.success === true
    } catch {
      return false
    }
  }
}
