import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import type { Db } from './db.js'

// ---- Passwords -----------------------------------------------------------

interface CostParams { N: number, r: number, p: number }

/**
 * OWASP's recommended minimum for scrypt. Each hash takes 128 × N × r = 128 MB of
 * memory; Node runs at most 4 at once (libuv's thread pool), so peak is ~512 MB.
 */
const SCRYPT_COST: CostParams = { N: 2 ** 17, r: 8, p: 1 }
/** Hashes written before parameters were stored in the hash string used these. */
const LEGACY_COST: CostParams = { N: 2 ** 14, r: 8, p: 1 }
const MAX_N = 2 ** 20
const KEY_LENGTH = 64

function scryptAsync(password: string, salt: Buffer, cost: CostParams): Promise<Buffer> {
  const options: ScryptOptions = { ...cost, maxmem: 256 * cost.N * cost.r }
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

/** Stored as `scrypt$N=…,r=…,p=…$<salt hex>$<key hex>` so the cost can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, SCRYPT_COST)
  const { N, r, p } = SCRYPT_COST
  return `scrypt$N=${N},r=${r},p=${p}$${salt.toString('hex')}$${key.toString('hex')}`
}

interface ParsedHash { cost: CostParams, salt: Buffer, key: Buffer }

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split('$')
  if (parts[0] !== 'scrypt') return null
  let cost = LEGACY_COST
  if (parts.length === 4) {
    const match = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(parts[1])
    if (!match) return null
    cost = { N: Number(match[1]), r: Number(match[2]), p: Number(match[3]) }
    // Bounds stop a tampered hash row from making verification hang or exhaust memory.
    if (cost.N < 2 || cost.N > MAX_N || cost.r < 1 || cost.r > 32 || cost.p < 1 || cost.p > 16) return null
  } else if (parts.length !== 3) {
    return null
  }
  const [saltHex, keyHex] = parts.slice(-2)
  if (!saltHex || !keyHex) return null
  return { cost, salt: Buffer.from(saltHex, 'hex'), key: Buffer.from(keyHex, 'hex') }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored)
  if (!parsed) return false
  const actual = await scryptAsync(password, parsed.salt, parsed.cost)
  return actual.length === parsed.key.length && timingSafeEqual(actual, parsed.key)
}

/** True for hashes made with an older, weaker cost — re-hash them on the next successful login. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored)
  return !parsed
    || parsed.cost.N !== SCRYPT_COST.N || parsed.cost.r !== SCRYPT_COST.r || parsed.cost.p !== SCRYPT_COST.p
}

/**
 * Hashed once at startup and checked against when a login email doesn't exist, so
 * unknown and known emails take the same time to reject.
 */
export const DUMMY_HASH_PROMISE = hashPassword(randomBytes(16).toString('hex'))

// ---- Sessions ------------------------------------------------------------

export const SESSION_COOKIE = 'session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Oldest sessions beyond this are signed out, so repeated logins can't grow the table without bound. */
export const MAX_SESSIONS_PER_USER = 20

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(db: Db, userId: number): Promise<{ token: string, expiresAt: number }> {
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  const expiresAt = now + SESSION_TTL_MS
  await db.batch([
    {
      sql: 'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      args: [hashToken(token), userId, expiresAt],
    },
    {
      sql: `DELETE FROM sessions WHERE user_id = ? AND token_hash NOT IN (
              SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY rowid DESC LIMIT ?
            )`,
      args: [userId, userId, MAX_SESSIONS_PER_USER],
    },
    // There's no long-running process on Vercel to sweep these on a timer, so expired
    // rows are cleared whenever someone signs in.
    { sql: 'DELETE FROM sessions WHERE expires_at <= ?', args: [now] },
    { sql: 'DELETE FROM rate_limits WHERE reset_at <= ?', args: [now] },
  ])
  return { token, expiresAt }
}

export interface SessionUser {
  id: number
  email: string
}

export async function userForSession(db: Db, token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  const row = await db.get<{ id: number, email: string, expiresAt: number }>(`
    SELECT users.id AS id, users.email AS email, sessions.expires_at AS expiresAt
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `, hashToken(token))

  if (!row) return null
  if (row.expiresAt <= Date.now()) {
    await deleteSession(db, token)
    return null
  }
  return { id: row.id, email: row.email }
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token))
}

// ---- Rate limiting -------------------------------------------------------

/**
 * Rate-limit key for a client address. IPv6 users typically control a whole /64, so
 * keying on the full address would let one client rotate through billions of keys.
 */
export function clientKey(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  if (mapped) return mapped[1]
  if (!ip.includes(':')) return ip

  const [head, tail = ''] = ip.split('::')
  const headParts = head ? head.split(':') : []
  const tailParts = tail ? tail.split(':') : []
  const groups = ip.includes('::')
    ? [...headParts, ...Array(8 - headParts.length - tailParts.length).fill('0'), ...tailParts]
    : headParts
  return `${groups.slice(0, 4).map(g => g.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`
}

export interface RateLimit {
  limit: number
  windowMs: number
}

/**
 * Fixed-window counter stored in the database, so every server instance (each Vercel
 * function instance, or a restarted process) shares the same counts. One atomic
 * upsert per hit; returns true if this hit is allowed.
 */
export async function hitRateLimit(db: Db, key: string, { limit, windowMs }: RateLimit): Promise<boolean> {
  const now = Date.now()
  const row = await db.get<{ count: number }>(`
    INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT (key) DO UPDATE SET
      count    = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
    RETURNING count
  `, key, now + windowMs, now, now)
  return row !== undefined && row.count <= limit
}

/**
 * Gives back one hit, for attempts that turn out to be legitimate (a successful
 * sign-in). Counting happens up front so concurrent attempts can't all slip past the
 * limit before any is recorded; refunding afterwards means only failures use it up.
 */
export async function refundRateLimit(db: Db, key: string): Promise<void> {
  await db.run('UPDATE rate_limits SET count = MAX(count - 1, 0) WHERE key = ?', key)
}
