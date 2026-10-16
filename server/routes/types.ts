/** Shapes for the API routes: what each route module needs, and request/row shapes. */
import type { HumanCheck } from '../auth/index.js'
import type { Db } from '../db/index.js'

export interface AuthRouteOptions {
  db: Db
  secureCookies: boolean
  maxSignupsPerDay: number
  verifyHuman?: HumanCheck
}

export interface ProjectRouteOptions {
  db: Db
  maxProjectsPerUser: number
  maxStorageBytesPerUser: number
}

export interface AutosaveRouteOptions {
  db: Db
}

/** Body of sign-up and sign-in. */
export interface Credentials {
  email: string
  password: string
  turnstileToken?: string
}

/** A saved project as stored, with its data still JSON text. */
export interface ProjectRow {
  id: number
  name: string
  data: string
  updatedAt: string
}

/** A saved project as sent to the browser, with its data parsed. */
export interface ProjectResponse {
  id: number
  name: string
  data: unknown
  updatedAt: string
}

export interface IdParams {
  id: number
}
