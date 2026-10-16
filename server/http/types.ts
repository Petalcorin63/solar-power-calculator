/** Additions to Fastify's request type. */
import type { SessionUser } from '../auth/index.js'

declare module 'fastify' {
  interface FastifyRequest {
    /** Set for every /api/ request by the app from the session cookie; null when signed out. */
    user: SessionUser | null
  }
}

/** Options for `registerSecurity`. */
export interface SecurityOptions {
  /** True when served over HTTPS; also turns on HSTS. */
  secureCookies: boolean
}
