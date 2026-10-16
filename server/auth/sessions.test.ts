import { describe, expect, it } from 'vitest'
import { openDb } from '../db/index.js'
import { MAX_SESSIONS_PER_USER } from './constants.js'
import { createSession, userForSession } from './sessions.js'

describe('sessions', () => {
  it(`keeps at most ${MAX_SESSIONS_PER_USER} sessions per user, ending the oldest`, async () => {
    const db = await openDb({ url: ':memory:' })
    await db.run("INSERT INTO users (id, email, password_hash) VALUES (1, 'a@example.com', 'x')")
    const first = (await createSession(db, 1)).token
    const rest: string[] = []
    for (let i = 0; i < MAX_SESSIONS_PER_USER; i++) rest.push((await createSession(db, 1)).token)

    expect(await userForSession(db, first)).toBeNull()
    expect(await userForSession(db, rest.at(-1))).toMatchObject({ id: 1 })
    expect(await db.get('SELECT COUNT(*) AS count FROM sessions')).toEqual({ count: MAX_SESSIONS_PER_USER })
  })

  it('clears expired sessions and rate-limit rows whenever a session is created', async () => {
    const db = await openDb({ url: ':memory:' })
    await db.run("INSERT INTO users (id, email, password_hash) VALUES (1, 'a@example.com', 'x')")
    await db.run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('old', 1, 1)")
    await db.run("INSERT INTO rate_limits (key, count, reset_at) VALUES ('stale', 3, 1)")

    await createSession(db, 1)
    expect(await db.get("SELECT 1 AS found FROM sessions WHERE token_hash = 'old'")).toBeUndefined()
    expect(await db.get("SELECT 1 AS found FROM rate_limits WHERE key = 'stale'")).toBeUndefined()
  })
})
