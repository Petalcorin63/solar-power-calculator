/** Reads the environment into a ServerConfig, and turns that into the app's options. */
import { resolve } from 'node:path'
import { DEFAULT_QUOTAS, type AppOptions } from '../app/index.js'
import { turnstileVerifier } from '../auth/index.js'
import { openDb } from '../db/index.js'
import { DEFAULT_DB_PATH } from './constants.js'
import type { ServerConfig } from './types.js'

/**
 * TRUST_PROXY: unset/`false` when exposed directly; the proxy's address(es) when behind
 * one (`127.0.0.1`, or a comma-separated list / CIDR like `10.0.0.0/8`). `true` trusts
 * any sender of X-Forwarded-For, which is only safe if nothing but the proxy can reach
 * this port — as on Vercel, which overwrites the header with the real client IP.
 */
function parseTrustProxy(value: string | undefined, fallback: boolean): boolean | string {
  if (!value) return fallback
  if (value === 'false') return false
  if (value === 'true') return true
  return value
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, production = env.NODE_ENV === 'production'): ServerConfig {
  const onVercel = env.VERCEL === '1'
  if (onVercel && !env.TURSO_DATABASE_URL) {
    // A local file on Vercel would silently lose every account on the next cold start.
    throw new Error('TURSO_DATABASE_URL must be set on Vercel — functions have no persistent disk')
  }

  return {
    db: env.TURSO_DATABASE_URL
      ? { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }
      : { url: resolve(env.DB_PATH ?? DEFAULT_DB_PATH) },
    // Secure cookies are only sent over HTTPS — on by default in production; set
    // COOKIE_SECURE=false only when testing a production build over plain http locally.
    secureCookies: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : production || onVercel,
    trustProxy: parseTrustProxy(env.TRUST_PROXY, onVercel),
    quotas: {
      maxSignupsPerDay: positiveInt(env.MAX_SIGNUPS_PER_DAY, DEFAULT_QUOTAS.maxSignupsPerDay),
      maxProjectsPerUser: DEFAULT_QUOTAS.maxProjectsPerUser,
      maxStorageBytesPerUser: DEFAULT_QUOTAS.maxStorageBytesPerUser,
    },
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY || undefined,
  }
}

/** Everything `buildApp` needs from the config; shared by the local server and the Vercel function. */
export async function appOptionsFrom(config: ServerConfig): Promise<AppOptions> {
  return {
    db: await openDb(config.db),
    secureCookies: config.secureCookies,
    trustProxy: config.trustProxy,
    quotas: config.quotas,
    verifyHuman: config.turnstileSecretKey ? turnstileVerifier(config.turnstileSecretKey) : undefined,
    logger: true,
  }
}
