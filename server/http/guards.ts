/** Route guards: require a signed-in user, and read that user. */
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SessionUser } from '../auth/index.js'
import { HttpError } from './errors.js'
import './types.js'

/**
 * Route `preHandler`: rejects the request with 401 unless someone is signed in.
 * Returning the reply is what tells Fastify to stop here instead of running the handler.
 */
export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined> {
  if (!request.user) return reply.code(401).send({ error: 'Not signed in' })
  return undefined
}

/**
 * The signed-in user, for routes behind `requireUser`. Throws rather than returning null
 * so handlers get a non-null user without `!` assertions.
 */
export function currentUser(request: FastifyRequest): SessionUser {
  if (!request.user) throw new HttpError(401, 'Not signed in')
  return request.user
}
