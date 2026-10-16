/**
 * The database schema, created on startup with `CREATE … IF NOT EXISTS`. There are no
 * migrations yet: adding a column means adding a migration step alongside this.
 */

export const SCHEMA = [
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
export const LOCAL_PRAGMAS = [
  'PRAGMA foreign_keys = ON',
  'PRAGMA journal_mode = WAL',
  // Overwrite deleted content (old password hashes, ended sessions) instead of leaving
  // it readable in free pages of the file.
  'PRAGMA secure_delete = ON',
]
