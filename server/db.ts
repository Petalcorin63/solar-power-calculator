import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'

// Derived rather than imported: @libsql/client re-exports these from a transitive
// package, which Vercel's type-check can't follow through pnpm's layout.
type Client = ReturnType<typeof createClient>
/** Values a statement argument can take (libSQL's `InValue`). */
export type InValue = null | string | number | bigint | boolean | ArrayBuffer | Uint8Array | Date

/**
 * Thin async wrapper over libSQL. The same code runs against a local SQLite file
 * (dev, `pnpm start`), `:memory:` (tests), or a hosted Turso database (Vercel, whose
 * functions have no persistent disk).
 */
export interface Db {
  get<T>(sql: string, ...args: InValue[]): Promise<T | undefined>
  all<T>(sql: string, ...args: InValue[]): Promise<T[]>
  run(sql: string, ...args: InValue[]): Promise<{ changes: number, lastInsertRowid: number }>
  /** Runs the statements in one transaction (and one round trip for a remote database). */
  batch(statements: { sql: string, args: InValue[] }[]): Promise<void>
  close(): void
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX IF NOT EXISTS users_created ON users(created_at)',

  // Only a SHA-256 of each session token is stored, so a leaked database can't be
  // used to hijack sessions.
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)',

  `CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX IF NOT EXISTS projects_user ON projects(user_id)',

  // One working state per user, saved automatically as they edit.
  `CREATE TABLE IF NOT EXISTS autosaves (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // Login/sign-up attempt counters. They live in the database rather than in memory
  // because on Vercel each function instance has its own memory and starts empty.
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key      TEXT PRIMARY KEY,
    count    INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
  )`,
]

/**
 * Connection pragmas for local SQLite files. A hosted Turso database manages its own
 * storage, and pragmas don't persist across its stateless HTTP requests anyway.
 */
const LOCAL_PRAGMAS = [
  'PRAGMA foreign_keys = ON',
  'PRAGMA journal_mode = WAL',
  // Overwrite deleted content (old password hashes, ended sessions) instead of leaving
  // it readable in free pages of the file.
  'PRAGMA secure_delete = ON',
]

export interface DbConfig {
  /** `:memory:`, a file path, or a `libsql://` / `https://` URL for a hosted database. */
  url: string
  authToken?: string
}

function isRemote(url: string): boolean {
  return /^(libsql|https?|wss?):\/\//.test(url)
}

/** libSQL rows are array-like; turn them into plain objects keyed by column name. */
function toObjects<T>(result: { columns: string[], rows: ArrayLike<unknown>[] }): T[] {
  return result.rows.map(row => Object.fromEntries(result.columns.map((column, i) => [column, row[i]])) as T)
}

export async function openDb({ url, authToken }: DbConfig): Promise<Db> {
  let client: Client
  if (isRemote(url)) {
    client = createClient({ url, authToken })
  } else if (url === ':memory:') {
    client = createClient({ url: ':memory:' })
  } else {
    mkdirSync(dirname(url), { recursive: true, mode: 0o700 })
    client = createClient({ url: `file:${url}` })
    for (const pragma of LOCAL_PRAGMAS) await client.execute(pragma)
    restrictToOwner(url)
  }
  if (url === ':memory:') await client.execute('PRAGMA foreign_keys = ON')

  await client.batch(SCHEMA, 'write')

  return {
    async get<T>(sql: string, ...args: InValue[]) {
      return toObjects<T>(await client.execute({ sql, args }))[0]
    },
    async all<T>(sql: string, ...args: InValue[]) {
      return toObjects<T>(await client.execute({ sql, args }))
    },
    async run(sql: string, ...args: InValue[]) {
      const result = await client.execute({ sql, args })
      return { changes: result.rowsAffected, lastInsertRowid: Number(result.lastInsertRowid ?? 0) }
    },
    async batch(statements) {
      await client.batch(statements, 'write')
    },
    close: () => client.close(),
  }
}

/**
 * A local database file holds password hashes and session hashes, so other users on
 * the host shouldn't be able to read it. SQLite gives the -wal/-shm files the same
 * mode. No-op on Windows, where file access is governed by ACLs instead.
 */
function restrictToOwner(path: string) {
  if (process.platform === 'win32') return
  chmodSync(path, 0o600)
}
