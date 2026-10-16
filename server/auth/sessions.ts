/**
 * Login sessions. The browser holds a random token in an httpOnly cookie; the database
 * stores only its SHA-256, so a leaked database can't be used to hijack sessions.
 */
import { createHash, randomBytes } from 'node:crypto'
import type { Db } from '../db/index.js'
import { MAX_SESSIONS_PER_USER, SESSION_TOKEN_BYTES, SESSION_TTL_MS } from './constants.js'
import type { SessionUser } from './types.js'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Starts a session for `userId` and returns its token (to put in the cookie). Also
 * trims the user's oldest sessions and sweeps expired rows — there's no long-running
 * process on Vercel to do that on a timer, so it happens whenever someone signs in.
 */
export async function createSession(db: Db, userId: number): Promise<{ token: string, expiresAt: number }> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url')
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
    { sql: 'DELETE FROM sessions WHERE expires_at <= ?', args: [now] },
    { sql: 'DELETE FROM rate_limits WHERE reset_at <= ?', args: [now] },
  ])
  return { token, expiresAt }
}

/** The signed-in user for a cookie token, or null if it's missing, unknown or expired. */
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
