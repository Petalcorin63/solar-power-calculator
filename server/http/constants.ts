/** Fixed values for HTTP-level protections. */

/**
 * The built frontend loads only same-origin scripts and styles (plus Cloudflare's
 * Turnstile widget, which is a script and an iframe), so a strict policy costs
 * nothing and blunts any XSS that slips through. On Vercel the page itself is served
 * by the CDN, so `vercel.json` sends the same policy (a test keeps them equal).
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  'frame-src https://challenges.cloudflare.com',
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/** The header (and value) every state-changing API request must send — the CSRF guard. */
export const CSRF_HEADER = 'x-requested-with'
export const CSRF_HEADER_VALUE = 'fetch'

/** Methods that don't change state, so need no CSRF header. */
export const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD'])

export const HSTS_MAX_AGE_SECONDS = 31_536_000
