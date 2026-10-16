/**
 * Saved projects: list, create, read, update (rename and/or new data) and delete.
 *
 * Every query filters by the signed-in user's id, and another user's project answers
 * 404 rather than 403, so ids can't be probed. Quotas (project count and total stored
 * bytes per user) are checked inside the INSERT/UPDATE itself — see FITS_STORAGE_QUOTA.
 */
import type { FastifyInstance } from 'fastify'
import { currentUser, requireUser } from '../http/index.js'
import { FITS_STORAGE_QUOTA } from './constants.js'
import { PROJECT_ERRORS } from './data/messages.js'
import { createProjectSchema, idParamsSchema, updateProjectSchema } from './data/schemas.js'
import { serializeData } from './saved-data.js'
import type { IdParams, ProjectResponse, ProjectRouteOptions, ProjectRow } from './types.js'

export function registerProjectRoutes(app: FastifyInstance, options: ProjectRouteOptions): void {
  const { db } = options

  async function getProject(id: number, userId: number): Promise<ProjectResponse | null> {
    const row = await db.get<ProjectRow>(`
      SELECT id, name, data, updated_at AS updatedAt FROM projects WHERE id = ? AND user_id = ?
    `, id, userId)
    return row ? { ...row, data: JSON.parse(row.data) as unknown } : null
  }

  app.get('/api/projects', { preHandler: requireUser }, async request => {
    const projects = await db.all(`
      SELECT id, name, updated_at AS updatedAt FROM projects
      WHERE user_id = ? ORDER BY updated_at DESC, id DESC
    `, currentUser(request).id)
    return { projects }
  })

  app.post<{ Body: { name: string, data: object } }>('/api/projects', {
    preHandler: requireUser,
    schema: { body: createProjectSchema },
  }, async (request, reply) => {
    const userId = currentUser(request).id
    const data = serializeData(request.body.data)

    const result = await db.run(`
      INSERT INTO projects (user_id, name, data)
      SELECT ?, ?, ?
      WHERE (SELECT COUNT(*) FROM projects WHERE user_id = ?) < ?
        AND ${FITS_STORAGE_QUOTA}
    `, userId, request.body.name.trim() || 'Untitled', data,
      userId, options.maxProjectsPerUser,
      userId, null, Buffer.byteLength(data), options.maxStorageBytesPerUser)

    if (result.changes === 0) {
      // Nothing inserted: work out which quota blocked it, to say which limit was hit.
      const row = await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM projects WHERE user_id = ?', userId)
      return (row?.count ?? 0) >= options.maxProjectsPerUser
        ? reply.code(409).send({ error: `You can save up to ${options.maxProjectsPerUser} projects — delete one first` })
        : reply.code(413).send(PROJECT_ERRORS.storageFull)
    }
    return reply.code(201).send(await getProject(result.lastInsertRowid, userId))
  })

  app.get<{ Params: IdParams }>('/api/projects/:id', {
    preHandler: requireUser,
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    return await getProject(request.params.id, currentUser(request).id) ?? reply.code(404).send(PROJECT_ERRORS.notFound)
  })

  app.put<{ Params: IdParams, Body: { name?: string, data?: object } }>('/api/projects/:id', {
    preHandler: requireUser,
    schema: { params: idParamsSchema, body: updateProjectSchema },
  }, async (request, reply) => {
    const userId = currentUser(request).id
    const { id } = request.params
    if (!await getProject(id, userId)) return reply.code(404).send(PROJECT_ERRORS.notFound)

    const name = request.body.name?.trim()
    const data = request.body.data === undefined ? undefined : serializeData(request.body.data)

    // A rename (no new data) always fits; new data must fit alongside the user's other projects.
    const result = await db.run(`
      UPDATE projects SET
        name = COALESCE(?, name),
        data = COALESCE(?, data),
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
        AND (? IS NULL OR ${FITS_STORAGE_QUOTA})
    `, name || null, data ?? null, id, userId,
      data ?? null, userId, id, Buffer.byteLength(data ?? ''), options.maxStorageBytesPerUser)
    if (result.changes === 0) return reply.code(413).send(PROJECT_ERRORS.storageFull)
    return getProject(id, userId)
  })

  app.delete<{ Params: IdParams }>('/api/projects/:id', {
    preHandler: requireUser,
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    const result = await db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', request.params.id, currentUser(request).id)
    return result.changes ? { ok: true } : reply.code(404).send(PROJECT_ERRORS.notFound)
  })
}
