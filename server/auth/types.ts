/** Shapes for authentication: the signed-in user, rate-limit rules, password cost, the bot check. */

export interface SessionUser {
  id: number
  email: string
}

export interface RateLimit {
  limit: number
  windowMs: number
}

/** scrypt cost parameters, stored in each hash so they can be raised later. */
export interface ScryptCost {
  N: number
  r: number
  p: number
}

/**
 * Checks that a sign-in/sign-up request came from a person, given the token the
 * Turnstile widget produced in their browser.
 */
export type HumanCheck = (token: string | undefined, ip: string) => Promise<boolean>
