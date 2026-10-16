/** Shapes for the database layer: the `Db` interface every query uses, and its connection config. */

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

export interface DbConfig {
  /** `:memory:`, a file path, or a `libsql://` / `https://` URL for a hosted database. */
  url: string
  authToken?: string
}
