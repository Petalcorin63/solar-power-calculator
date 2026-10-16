/** Auto-save: one working state per user, written as they edit and restored on sign-in. */
import type { FastifyInstance } from 'fastify'
import { currentUser, requireUser } from '../http/index.js'
import { autosaveSchema } from './data/schemas.js'
import { serializeData } from './saved-data.js'
import type { AutosaveRouteOptions } from './types.js'

export function registerAutosaveRoutes(app: FastifyInstance, options: AutosaveRouteOptions): void {
  const { db } = options

  app.get('/api/autosave', { preHandler: requireUser }, async request => {
    const row = await db.get<{ data: string, updatedAt: string }>(
      'SELECT data, updated_at AS updatedAt FROM autosaves WHERE user_id = ?', currentUser(request).id,
    )
    return row ? { data: JSON.parse(row.data) as unknown, updatedAt: row.updatedAt } : { data: null, updatedAt: null }
  })

  app.put<{ Body: { data: object } }>('/api/autosave', {
    preHandler: requireUser,
    schema: { body: autosaveSchema },
  }, async request => {
    await db.run(`
      INSERT INTO autosaves (user_id, data) VALUES (?, ?)
      ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
    `, currentUser(request).id, serializeData(request.body.data))
    return { ok: true }
  })
}
