/** Opens the database (a local SQLite file, `:memory:`, or hosted Turso) and creates the schema. */
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { LOCAL_PRAGMAS, SCHEMA } from './data/schema.js'
import type { Db, DbConfig, InValue } from './types.js'

// Derived rather than imported: @libsql/client re-exports these from a transitive
// package, which Vercel's type-check can't follow through pnpm's layout.
type Client = ReturnType<typeof createClient>

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
    close: () => { client.close() },
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
