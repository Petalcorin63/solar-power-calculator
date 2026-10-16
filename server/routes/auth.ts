/**
 * Accounts: sign-up, sign-in, sign-out and "who am I".
 *
 * Order of checks on sign-up and sign-in, cheapest first, so abuse costs the server as
 * little as possible: rate limit → bot check (Turnstile) → database lookup → password
 * hashing (~0.5 s of CPU each).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  LOGIN_PER_ACCOUNT,
  LOGIN_PER_ADDRESS,
  REGISTER_PER_ADDRESS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clientKey,
  createSession,
  deleteSession,
  dummyHash,
  hashPassword,
  hitRateLimit,
  needsRehash,
  refundRateLimit,
  verifyPassword,
} from '../auth/index.js'
import { AUTH_ERRORS } from './data/messages.js'
import { credentialsSchema } from './data/schemas.js'
import type { AuthRouteOptions, Credentials } from './types.js'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && err.message.includes('UNIQUE constraint failed')
}

export function registerAuthRoutes(app: FastifyInstance, options: AuthRouteOptions): void {
  const { db } = options

  function setSessionCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: options.secureCookies,
      maxAge: SESSION_TTL_MS / 1000,
    })
  }

  /** Starts a fresh session, ending any session the request already carried. */
  async function startSession(request: FastifyRequest, reply: FastifyReply, userId: number): Promise<void> {
    const previous = request.cookies[SESSION_COOKIE]
    if (previous) await deleteSession(db, previous)
    setSessionCookie(reply, (await createSession(db, userId)).token)
  }

  /** The Turnstile check; passes when no check is configured. */
  async function isHuman(request: FastifyRequest<{ Body: Credentials }>): Promise<boolean> {
    return !options.verifyHuman || await options.verifyHuman(request.body.turnstileToken, request.ip)
  }

  app.post<{ Body: Credentials }>('/api/auth/register', { schema: { body: credentialsSchema } }, async (request, reply) => {
    if (!await hitRateLimit(db, `register:${clientKey(request.ip)}`, REGISTER_PER_ADDRESS)) {
      return reply.code(429).send(AUTH_ERRORS.tooManySignups)
    }
    if (!await isHuman(request)) return reply.code(400).send(AUTH_ERRORS.notVerified)

    const email = normalizeEmail(request.body.email)
    if (await db.get('SELECT 1 FROM users WHERE email = ?', email)) {
      return reply.code(409).send(AUTH_ERRORS.duplicateEmail)
    }
    const recent = await db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users WHERE created_at > datetime('now', '-1 day')",
    )
    if (recent && recent.count >= options.maxSignupsPerDay) {
      request.log.warn('Daily sign-up cap reached')
      return reply.code(503).send(AUTH_ERRORS.signupsPaused)
    }

    const passwordHash = await hashPassword(request.body.password)
    let userId: number
    try {
      userId = (await db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', email, passwordHash)).lastInsertRowid
    } catch (err) {
      // Two sign-ups for the same email can both pass the check above while hashing.
      if (isUniqueViolation(err)) return reply.code(409).send(AUTH_ERRORS.duplicateEmail)
      throw err
    }

    await startSession(request, reply, userId)
    return reply.code(201).send({ user: { id: userId, email } })
  })

  app.post<{ Body: Credentials }>('/api/auth/login', { schema: { body: credentialsSchema } }, async (request, reply) => {
    const email = normalizeEmail(request.body.email)
    const addressKey = `login:${clientKey(request.ip)}`
    const accountKey = `${addressKey}|${email}`
    if (!await hitRateLimit(db, addressKey, LOGIN_PER_ADDRESS)) return reply.code(429).send(AUTH_ERRORS.tooManyLogins)
    if (!await hitRateLimit(db, accountKey, LOGIN_PER_ACCOUNT)) {
      // Retrying one locked account shouldn't use up the budget of everyone else
      // sharing this address (mobile carriers, schools and offices share IPs).
      await refundRateLimit(db, addressKey)
      return reply.code(429).send(AUTH_ERRORS.tooManyLogins)
    }
    if (!await isHuman(request)) return reply.code(400).send(AUTH_ERRORS.notVerified)

    const user = await db.get<{ id: number, passwordHash: string }>(
      'SELECT id, password_hash AS passwordHash FROM users WHERE email = ?', email,
    )
    // Always run a full hash, even for unknown emails, so both take the same time.
    const ok = await verifyPassword(request.body.password, user?.passwordHash ?? await dummyHash())
    if (!user || !ok) return reply.code(401).send(AUTH_ERRORS.wrongCredentials)

    // Only failed attempts count toward the limits.
    await Promise.all([refundRateLimit(db, addressKey), refundRateLimit(db, accountKey)])

    if (needsRehash(user.passwordHash)) {
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(request.body.password), user.id)
    }
    await startSession(request, reply, user.id)
    return { user: { id: user.id, email } }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await deleteSession(db, token)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/api/auth/me', request => ({ user: request.user }))
}
