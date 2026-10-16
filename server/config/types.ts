/** Server settings read from the environment. */
import type { Quotas } from '../app/index.js'
import type { DbConfig } from '../db/index.js'

export interface ServerConfig {
  db: DbConfig
  secureCookies: boolean
  trustProxy: boolean | string
  quotas: Quotas
  /** Cloudflare Turnstile secret; when set, sign-in and sign-up require a passed check. */
  turnstileSecretKey?: string
}
