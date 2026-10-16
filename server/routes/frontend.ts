/**
 * Serves the built frontend (Vite's `dist/`) for self-hosting with `pnpm start`. Any
 * other GET outside /api/ gets index.html, so client-side URLs load the app. In dev
 * Vite serves the frontend, and on Vercel the CDN does, so `staticDir` is unset there.
 */
import { existsSync } from 'node:fs'
import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'

export async function registerFrontend(app: FastifyInstance, staticDir: string | undefined): Promise<void> {
  const hasFrontend = staticDir !== undefined && existsSync(staticDir)
  if (hasFrontend) await app.register(fastifyStatic, { root: staticDir })

  app.setNotFoundHandler(async (request, reply) => {
    if (hasFrontend && request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html')
    }
    return reply.code(404).send({ error: 'Not found' })
  })
}
