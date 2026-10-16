/** App-wide defaults and limits. */
import type { Quotas } from './types.js'

export const DEFAULT_QUOTAS: Quotas = {
  maxSignupsPerDay: 100,
  maxProjectsPerUser: 200,
  maxStorageBytesPerUser: 2_000_000,
}

/** Largest request body accepted; saved data itself is capped lower (routes/constants.ts). */
export const BODY_LIMIT_BYTES = 256 * 1024
