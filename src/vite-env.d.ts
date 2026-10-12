/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudflare Turnstile site key; unset disables the sign-in bot check. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
}
