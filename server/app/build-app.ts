/**
 * Builds the Fastify app. This file only assembles the pieces, in the order every
 * request meets them:
 *
 *   1. http/security.ts      headers, no-store on /api/, CSRF guard      (onRequest hook)
 *   2. session lookup        sets request.user from the session cookie  (onRequest hook)
 *   3. routes/*.ts           auth, projects, autosave                   (route handlers)
 *   4. error handler         validation → 400, HttpError → its status, anything else → 500
 *   5. routes/frontend.ts    the built frontend, then 404
 *
 * Used by server/index.ts (local / self-hosted) and api/index.ts (Vercel). Tests build
 * it with an in-memory database and call it through `app.inject`.
 */
import cookie from '@fastify/cookie'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import { SESSION_COOKIE, dummyHash, userForSession } from '../auth/index.js'
import { registerSecurity } from '../http/index.js'
import { registerAuthRoutes, registerAutosaveRoutes, registerFrontend, registerProjectRoutes } from '../routes/index.js'
import { BODY_LIMIT_BYTES, DEFAULT_QUOTAS } from './constants.js'
import type { AppOptions } from './types.js'

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const { db } = options
  const quotas = { ...DEFAULT_QUOTAS, ...options.quotas }
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: options.trustProxy ?? false,
  })

  // Start the one-off dummy hash now, so the first sign-in with an unknown email
  // doesn't take twice as long as one with a known email.
  void dummyHash()

  await app.register(cookie)
  app.decorateRequest('user', null)

  registerSecurity(app, { secureCookies: options.secureCookies })
  app.addHook('onRequest', async request => {
    if (request.url.startsWith('/api/')) request.user = await userForSession(db, request.cookies[SESSION_COOKIE])
  })

  app.setErrorHandler(async (error: FastifyError, request, reply) => {
    if (error.validation) return reply.code(400).send({ error: `Invalid request: ${error.message}` })
    if (error.statusCode && error.statusCode < 500) return reply.code(error.statusCode).send({ error: error.message })
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal server error' })
  })

  registerAuthRoutes(app, {
    db,
    secureCookies: options.secureCookies,
    maxSignupsPerDay: quotas.maxSignupsPerDay,
    verifyHuman: options.verifyHuman,
  })
  registerProjectRoutes(app, {
    db,
    maxProjectsPerUser: quotas.maxProjectsPerUser,
    maxStorageBytesPerUser: quotas.maxStorageBytesPerUser,
  })
  registerAutosaveRoutes(app, { db })
  await registerFrontend(app, options.staticDir)

  return app
}
