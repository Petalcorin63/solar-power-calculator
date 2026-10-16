/** Options for building the Fastify app. */
import type { HumanCheck } from '../auth/index.js'
import type { Db } from '../db/index.js'

export interface Quotas {
  /** New accounts allowed per rolling 24 h across everyone — caps how fast bots can add accounts. */
  maxSignupsPerDay: number
  maxProjectsPerUser: number
  /** Total size of one user's saved projects; with the sign-up cap this bounds database growth. */
  maxStorageBytesPerUser: number
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
