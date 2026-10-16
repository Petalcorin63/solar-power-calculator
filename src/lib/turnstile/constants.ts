/**
 * Cloudflare Turnstile ("verify you are human") for the sign-in form. Enabled by
 * setting VITE_TURNSTILE_SITE_KEY at build time; the server then needs the matching
 * TURNSTILE_SECRET_KEY, or the check is skipped on both sides.
 */
export const TURNSTILE_SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined

export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
