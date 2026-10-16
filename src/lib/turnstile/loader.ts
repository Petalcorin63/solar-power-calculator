/** Loads Cloudflare's Turnstile script on demand. */
import { TURNSTILE_SCRIPT_URL } from './constants'
import type { TurnstileApi } from './types'

let loading: Promise<TurnstileApi> | null = null

/** Loads Cloudflare's script once, on first use, so visitors who never sign in don't fetch it. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile failed to load'))
    }
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return loading
}
