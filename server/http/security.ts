/**
 * Protections applied to every response, before any route runs:
 *   - security headers (CSP, nosniff, frame denial, HSTS over HTTPS)
 *   - `Cache-Control: no-store` on API responses
 *   - the CSRF guard: state-changing API calls must carry `X-Requested-With: fetch`
 */
import type { FastifyInstance } from 'fastify'
import { CONTENT_SECURITY_POLICY, CSRF_HEADER, CSRF_HEADER_VALUE, HSTS_MAX_AGE_SECONDS, SAFE_METHODS } from './constants.js'
import type { SecurityOptions } from './types.js'

export function registerSecurity(app: FastifyInstance, options: SecurityOptions): void {
  app.addHook('onRequest', async (request, reply) => {
    reply.headers({
      'content-security-policy': CONTENT_SECURITY_POLICY,
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'same-origin',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      // HSTS only when served over HTTPS (which is when cookies are Secure).
      ...(options.secureCookies ? { 'strict-transport-security': `max-age=${HSTS_MAX_AGE_SECONDS}` } : {}),
    })

    if (!request.url.startsWith('/api/')) return
    // Account data must never be stored by shared caches or the browser's back/forward cache.
    reply.header('cache-control', 'no-store')

    // Browsers won't send a custom header cross-origin without a CORS preflight (which
    // this server never approves), so requiring one blocks CSRF on top of the
    // SameSite cookie.
    if (!SAFE_METHODS.has(request.method) && request.headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) {
      return reply.code(403).send({ error: 'Missing X-Requested-With header' })
    }
  })
}
