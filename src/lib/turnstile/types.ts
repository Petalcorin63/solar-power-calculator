/** Cloudflare Turnstile's browser API — the parts this app uses. */

export interface TurnstileRenderOptions {
  sitekey: string
  theme?: 'auto' | 'light' | 'dark'
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    /** Set by Cloudflare's script once it has loaded. */
    turnstile?: TurnstileApi
  }
}
