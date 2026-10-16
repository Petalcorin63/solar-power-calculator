/** Fixed parameters for passwords, sessions, rate limits and the bot check. */
import type { RateLimit, ScryptCost } from './types.js'

// ---- Passwords ------------------------------------------------------------------

/**
 * OWASP's recommended minimum for scrypt. Each hash takes 128 × N × r = 128 MB of
 * memory; Node runs at most 4 at once (libuv's thread pool), so peak is ~512 MB.
 */
export const SCRYPT_COST: ScryptCost = { N: 2 ** 17, r: 8, p: 1 }
/** Hashes written before parameters were stored in the hash string used these. */
export const LEGACY_SCRYPT_COST: ScryptCost = { N: 2 ** 14, r: 8, p: 1 }
/** Upper bounds on parameters read from a stored hash, so a tampered row can't hang or exhaust memory. */
export const MAX_SCRYPT_COST: ScryptCost = { N: 2 ** 20, r: 32, p: 16 }
export const SCRYPT_KEY_LENGTH = 64
export const SALT_LENGTH = 16

// ---- Sessions -------------------------------------------------------------------

export const SESSION_COOKIE = 'session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Oldest sessions beyond this are signed out, so repeated logins can't grow the table without bound. */
export const MAX_SESSIONS_PER_USER = 20
export const SESSION_TOKEN_BYTES = 32

// ---- Rate limits ------------------------------------------------------------------

const ONE_HOUR_MS = 60 * 60 * 1000
// Per address+email stops guessing one account's password; per address alone stops
// one client spraying a common password across many accounts. Kept tight because
// each attempt that gets through costs ~0.5 s of CPU, and Vercel's free plan has
// 4 CPU-hours a month: at these limits one address can burn at most ~1 CPU-hour.
export const LOGIN_PER_ACCOUNT: RateLimit = { limit: 5, windowMs: 15 * 60 * 1000 }
export const LOGIN_PER_ADDRESS: RateLimit = { limit: 10, windowMs: ONE_HOUR_MS }
export const REGISTER_PER_ADDRESS: RateLimit = { limit: 5, windowMs: ONE_HOUR_MS }

export const IPV6_GROUPS = 8
/** Groups kept from an IPv6 address: a /64, which one client typically controls in full. */
export const IPV6_PREFIX_GROUPS = 4

// ---- Bot check (Cloudflare Turnstile) --------------------------------------------

export const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
export const TURNSTILE_TIMEOUT_MS = 5000
