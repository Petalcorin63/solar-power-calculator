import { existsSync } from 'node:fs'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from 'fastify'
import {
  DUMMY_HASH_PROMISE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  clientKey,
  createSession,
  deleteSession,
  hashPassword,
  hitRateLimit,
  needsRehash,
  userForSession,
  verifyPassword,
  type RateLimit,
  type SessionUser,
} from './auth.js'
import type { Db } from './db.js'
import type { HumanCheck } from './turnstile.js'

export interface Quotas {
  /** New accounts allowed per rolling 24 h across everyone — caps how fast bots can add accounts. */
  maxSignupsPerDay: number
  maxProjectsPerUser: number
  /** Total size of one user's saved projects; with the sign-up cap this bounds database growth. */
  maxStorageBytesPerUser: number
}

export const DEFAULT_QUOTAS: Quotas = {
  maxSignupsPerDay: 100,
  maxProjectsPerUser: 200,
  maxStorageBytesPerUser: 2_000_000,
}

export interface AppOptions {
  db: Db
  /** Set the Secure flag on the session cookie — required when served over HTTPS. */
  secureCookies: boolean
  /** Built frontend to serve (Vite's `dist/`); omitted in dev and on Vercel, where it's served separately. */
  staticDir?: string
  logger?: boolean
  /**
   * Fastify's `trustProxy`: set when behind a reverse proxy so `request.ip` (and with it
   * every rate limit) is the real client, not the proxy. Leave off when the server is
   * exposed directly — trusting X-Forwarded-For there lets clients spoof their IP.
   */
  trustProxy?: boolean | string
  quotas?: Partial<Quotas>
  /** Bot check for sign-in and sign-up (Cloudflare Turnstile); omitted, no check is made. */
  verifyHuman?: HumanCheck
}

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

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null
  }
}

/** Largest single saved state; a real project is a few KB. */
const MAX_DATA_BYTES = 200_000

const ONE_HOUR = 60 * 60 * 1000
// Per address+email stops guessing one account's password; per address alone stops
// one client spraying a common password across many accounts. Kept tight because
// each attempt that gets through costs ~0.5 s of CPU, and Vercel's free plan has
// 4 CPU-hours a month: at these limits one address can burn at most ~1 CPU-hour.
const LOGIN_PER_ACCOUNT: RateLimit = { limit: 5, windowMs: 15 * 60 * 1000 }
const LOGIN_PER_ADDRESS: RateLimit = { limit: 10, windowMs: ONE_HOUR }
const REGISTER_PER_ADDRESS: RateLimit = { limit: 5, windowMs: ONE_HOUR }

const credentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', minLength: 3, maxLength: 254, pattern: '^\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*$' },
    // Upper bound keeps scrypt work per request bounded.
    password: { type: 'string', minLength: 8, maxLength: 256 },
    turnstileToken: { type: 'string', maxLength: 2048 },
  },
} as const

const nameSchema = { type: 'string', minLength: 1, maxLength: 100 } as const
const dataSchema = { type: 'object' } as const
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
} as const

interface Credentials { email: string, password: string, turnstileToken?: string }
interface ProjectRow { id: number, name: string, data: string, updatedAt: string }

/** Thrown by route helpers to end the request with a specific status and message. */
class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export async function buildApp(options: AppOptions) {
  const { db } = options
  const quotas = { ...DEFAULT_QUOTAS, ...options.quotas }
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 256 * 1024,
    trustProxy: options.trustProxy ?? false,
  })

  await app.register(cookie)
  app.decorateRequest('user', null)

  app.addHook('onRequest', async (request, reply) => {
    reply.headers({
      'content-security-policy': CONTENT_SECURITY_POLICY,
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'same-origin',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      ...(options.secureCookies ? { 'strict-transport-security': 'max-age=31536000' } : {}),
    })

    if (!request.url.startsWith('/api/')) return
    // Account data must never be stored by shared caches or the browser's back/forward cache.
    reply.header('cache-control', 'no-store')

    // State-changing API calls must carry a custom header. Browsers won't send one
    // cross-origin without a CORS preflight (which this server never approves), so
    // this blocks CSRF on top of the SameSite cookie.
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.headers['x-requested-with'] !== 'fetch') {
      return reply.code(403).send({ error: 'Missing X-Requested-With header' })
    }

    request.user = await userForSession(db, request.cookies[SESSION_COOKIE])
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({ error: `Invalid request: ${error.message}` })
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: error.message })
    }
    request.log.error(error)
    return reply.code(500).send({ error: 'Internal server error' })
  })

  function setSessionCookie(reply: FastifyReply, token: string) {
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: options.secureCookies,
      maxAge: SESSION_TTL_MS / 1000,
    })
  }

  async function requireUser(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) return reply.code(401).send({ error: 'Not signed in' })
  }

  function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
  }

  /** Starts a fresh session, ending any session the request already carried. */
  async function startSession(request: FastifyRequest, reply: FastifyReply, userId: number) {
    const previous = request.cookies[SESSION_COOKIE]
    if (previous) await deleteSession(db, previous)
    setSessionCookie(reply, (await createSession(db, userId)).token)
  }

  function isUniqueViolation(err: unknown): boolean {
    return err instanceof Error && err.message.includes('UNIQUE constraint failed')
  }

  // ---- Auth ----------------------------------------------------------------

  const duplicateEmail = { error: 'An account with that email already exists' }

  /** Runs after the rate limit (cheap) and before any lookup or hashing (expensive). */
  async function isHuman(request: FastifyRequest<{ Body: Credentials }>): Promise<boolean> {
    return !options.verifyHuman || await options.verifyHuman(request.body.turnstileToken, request.ip)
  }
  const notVerified = { error: 'Please complete the “verify you are human” check and try again' }

  app.post<{ Body: Credentials }>('/api/auth/register', { schema: { body: credentialsSchema } }, async (request, reply) => {
    if (!await hitRateLimit(db, `register:${clientKey(request.ip)}`, REGISTER_PER_ADDRESS)) {
      return reply.code(429).send({ error: 'Too many sign-ups from this address — try again later' })
    }
    if (!await isHuman(request)) return reply.code(400).send(notVerified)

    const email = normalizeEmail(request.body.email)
    if (await db.get('SELECT 1 FROM users WHERE email = ?', email)) {
      return reply.code(409).send(duplicateEmail)
    }
    const recent = await db.get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users WHERE created_at > datetime('now', '-1 day')",
    )
    if (recent && recent.count >= quotas.maxSignupsPerDay) {
      request.log.warn('Daily sign-up cap reached')
      return reply.code(503).send({ error: 'New sign-ups are paused for now — please try again tomorrow' })
    }

    const passwordHash = await hashPassword(request.body.password)
    let userId: number
    try {
      userId = (await db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', email, passwordHash)).lastInsertRowid
    } catch (err) {
      // Two sign-ups for the same email can both pass the check above while hashing.
      if (isUniqueViolation(err)) return reply.code(409).send(duplicateEmail)
      throw err
    }

    await startSession(request, reply, userId)
    return reply.code(201).send({ user: { id: userId, email } })
  })

  app.post<{ Body: Credentials }>('/api/auth/login', { schema: { body: credentialsSchema } }, async (request, reply) => {
    const email = normalizeEmail(request.body.email)
    const address = clientKey(request.ip)
    if (!await hitRateLimit(db, `login:${address}`, LOGIN_PER_ADDRESS)
      || !await hitRateLimit(db, `login:${address}|${email}`, LOGIN_PER_ACCOUNT)) {
      return reply.code(429).send({ error: 'Too many sign-in attempts — try again later' })
    }
    if (!await isHuman(request)) return reply.code(400).send(notVerified)

    const user = await db.get<{ id: number, passwordHash: string }>(
      'SELECT id, password_hash AS passwordHash FROM users WHERE email = ?', email,
    )
    const ok = await verifyPassword(request.body.password, user?.passwordHash ?? await DUMMY_HASH_PROMISE)
    if (!user || !ok) {
      return reply.code(401).send({ error: 'Incorrect email or password' })
    }

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

  app.get('/api/auth/me', async request => ({ user: request.user }))

  // ---- Saved projects ------------------------------------------------------

  function serializeData(data: unknown): string {
    const json = JSON.stringify(data)
    if (Buffer.byteLength(json) > MAX_DATA_BYTES) throw new HttpError(413, 'Project data is too large')
    return json
  }

  /** Rejects a write that would take the user's saved projects past their storage quota. */
  async function checkStorage(userId: number, newBytes: number, replacingProjectId?: number) {
    const row = await db.get<{ bytes: number }>(`
      SELECT COALESCE(SUM(length(CAST(data AS BLOB))), 0) AS bytes FROM projects
      WHERE user_id = ? AND id IS NOT ?
    `, userId, replacingProjectId ?? null)
    if ((row?.bytes ?? 0) + newBytes > quotas.maxStorageBytesPerUser) {
      throw new HttpError(413, 'Your saved projects have reached the storage limit — delete some first')
    }
  }

  async function getProject(id: number, userId: number) {
    const row = await db.get<ProjectRow>(`
      SELECT id, name, data, updated_at AS updatedAt FROM projects WHERE id = ? AND user_id = ?
    `, id, userId)
    return row ? { ...row, data: JSON.parse(row.data) } : null
  }

  app.get('/api/projects', { preHandler: requireUser }, async request => {
    const projects = await db.all(`
      SELECT id, name, updated_at AS updatedAt FROM projects
      WHERE user_id = ? ORDER BY updated_at DESC, id DESC
    `, request.user!.id)
    return { projects }
  })

  app.post<{ Body: { name: string, data: object } }>('/api/projects', {
    preHandler: requireUser,
    schema: {
      body: {
        type: 'object',
        required: ['name', 'data'],
        additionalProperties: false,
        properties: { name: nameSchema, data: dataSchema },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.id
    const data = serializeData(request.body.data)
    await checkStorage(userId, Buffer.byteLength(data))

    // The count check is part of the INSERT so concurrent saves can't overshoot it.
    const result = await db.run(`
      INSERT INTO projects (user_id, name, data)
      SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM projects WHERE user_id = ?) < ?
    `, userId, request.body.name.trim() || 'Untitled', data, userId, quotas.maxProjectsPerUser)
    if (result.changes === 0) {
      return reply.code(409).send({ error: `You can save up to ${quotas.maxProjectsPerUser} projects — delete one first` })
    }
    return reply.code(201).send(await getProject(result.lastInsertRowid, userId))
  })

  app.get<{ Params: { id: number } }>('/api/projects/:id', {
    preHandler: requireUser,
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    return await getProject(request.params.id, request.user!.id) ?? reply.code(404).send({ error: 'Project not found' })
  })

  app.put<{ Params: { id: number }, Body: { name?: string, data?: object } }>('/api/projects/:id', {
    preHandler: requireUser,
    schema: {
      params: idParamsSchema,
      body: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: { name: nameSchema, data: dataSchema },
      },
    },
  }, async (request, reply) => {
    const userId = request.user!.id
    const { id } = request.params
    if (!await getProject(id, userId)) return reply.code(404).send({ error: 'Project not found' })

    const name = request.body.name?.trim()
    const data = request.body.data === undefined ? undefined : serializeData(request.body.data)
    if (data !== undefined) await checkStorage(userId, Buffer.byteLength(data), id)

    await db.run(`
      UPDATE projects SET
        name = COALESCE(?, name),
        data = COALESCE(?, data),
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `, name || null, data ?? null, id, userId)
    return getProject(id, userId)
  })

  app.delete<{ Params: { id: number } }>('/api/projects/:id', {
    preHandler: requireUser,
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    const result = await db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', request.params.id, request.user!.id)
    return result.changes ? { ok: true } : reply.code(404).send({ error: 'Project not found' })
  })

  // ---- Auto-save -----------------------------------------------------------

  app.get('/api/autosave', { preHandler: requireUser }, async request => {
    const row = await db.get<{ data: string, updatedAt: string }>(
      'SELECT data, updated_at AS updatedAt FROM autosaves WHERE user_id = ?', request.user!.id,
    )
    return row ? { data: JSON.parse(row.data), updatedAt: row.updatedAt } : { data: null, updatedAt: null }
  })

  app.put<{ Body: { data: object } }>('/api/autosave', {
    preHandler: requireUser,
    schema: {
      body: {
        type: 'object',
        required: ['data'],
        additionalProperties: false,
        properties: { data: dataSchema },
      },
    },
  }, async request => {
    await db.run(`
      INSERT INTO autosaves (user_id, data) VALUES (?, ?)
      ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
    `, request.user!.id, serializeData(request.body.data))
    return { ok: true }
  })

  // ---- Frontend ------------------------------------------------------------

  if (options.staticDir && existsSync(options.staticDir)) {
    await app.register(fastifyStatic, { root: options.staticDir })
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/') && options.staticDir && existsSync(options.staticDir)) {
      return reply.sendFile('index.html')
    }
    return reply.code(404).send({ error: 'Not found' })
  })

  return app
}
