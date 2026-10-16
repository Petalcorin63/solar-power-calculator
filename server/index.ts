// Long-running server for local development and self-hosting (`pnpm dev:server`,
// `pnpm start`). On Vercel, `api/index.ts` serves the same app as a function instead.
import { resolve } from 'node:path'
import { buildApp } from './app/index.js'
import { appOptionsFrom, loadConfig } from './config/index.js'

const production = process.env.NODE_ENV === 'production' || process.argv.includes('--production')
const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1')

const config = loadConfig(process.env, production)
const app = await buildApp({
  ...await appOptionsFrom(config),
  staticDir: production ? resolve('dist') : undefined,
})

await app.listen({ port, host })
