// Vercel Function serving every /api/* request (vercel.json rewrites them here). The
// built frontend is served by Vercel's CDN, not by this function.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildApp } from '../server/app.js'
import { appOptionsFrom, loadConfig } from '../server/config.js'

// Built once per function instance and reused across requests (and, with Fluid
// compute, across concurrent requests).
const appPromise = (async () => {
  const config = loadConfig()
  const app = await buildApp(await appOptionsFrom(config))
  if (!config.turnstileSecretKey) {
    app.log.warn('TURNSTILE_SECRET_KEY is not set — sign-in and sign-up have no bot check')
  }
  await app.ready()
  return app
})()

/**
 * vercel.json rewrites `/api/<path>` to this function. If the request arrives as the
 * rewritten form (`/api?path=<path>`) rather than the original URL, rebuild the
 * original so Fastify's routes still match.
 */
function originalUrl(url: string): string {
  const parsed = new URL(url, 'http://localhost')
  const path = parsed.searchParams.get('path')
  if (parsed.pathname !== '/api' || path === null) return url
  parsed.searchParams.delete('path')
  return `/api/${path}${parsed.search}`
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await appPromise
  req.url = originalUrl(req.url ?? '/')
  app.server.emit('request', req, res)
}
