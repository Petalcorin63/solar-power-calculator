/** The one place that talks HTTP to the server: JSON in and out, errors turned into `ApiError`. */
import { ApiError } from './errors'

export async function request<T>(method: string, url: string, body?: unknown, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: {
        // Required by the server on every state-changing request (CSRF guard).
        'X-Requested-With': 'fetch',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...init,
    })
  } catch {
    throw new ApiError(0, "Couldn't reach the server — check your connection")
  }

  const payload = await res.json().catch(() => null) as { error?: string } | null
  if (!res.ok) throw new ApiError(res.status, payload?.error ?? `Request failed (${res.status})`)
  return payload as T
}
