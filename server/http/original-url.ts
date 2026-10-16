/**
 * vercel.json rewrites `/api/<path>` to the single API function. If a request arrives
 * in the rewritten form (`/api?path=<path>`) rather than the original URL, rebuild
 * the original so Fastify's routes still match. Other URLs pass through unchanged.
 */
export function originalUrl(url: string): string {
  const parsed = new URL(url, 'http://localhost')
  const path = parsed.searchParams.get('path')
  if (parsed.pathname !== '/api' || path === null) return url
  parsed.searchParams.delete('path')
  return `/api/${path}${parsed.search}`
}
