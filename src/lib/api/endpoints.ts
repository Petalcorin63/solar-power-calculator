/**
 * One function per server endpoint the frontend calls. Imported as a namespace —
 * `import { api } from '../lib/api'`, then `api.login(…)` — so call sites read clearly.
 */
import { request } from './request'
import type { Project, ProjectSummary, User } from './types'

export function me(): Promise<{ user: User | null }> {
  return request('GET', '/api/auth/me')
}

export function register(email: string, password: string, turnstileToken?: string): Promise<{ user: User }> {
  return request('POST', '/api/auth/register', { email, password, turnstileToken })
}

export function login(email: string, password: string, turnstileToken?: string): Promise<{ user: User }> {
  return request('POST', '/api/auth/login', { email, password, turnstileToken })
}

export function logout(): Promise<{ ok: true }> {
  return request('POST', '/api/auth/logout')
}

export function listProjects(): Promise<{ projects: ProjectSummary[] }> {
  return request('GET', '/api/projects')
}

export function getProject(id: number): Promise<Project> {
  return request('GET', `/api/projects/${id}`)
}

export function createProject(name: string, data: object): Promise<Project> {
  return request('POST', '/api/projects', { name, data })
}

export function updateProject(id: number, changes: { name?: string, data?: object }): Promise<Project> {
  return request('PUT', `/api/projects/${id}`, changes)
}

export function deleteProject(id: number): Promise<{ ok: true }> {
  return request('DELETE', `/api/projects/${id}`)
}

export function getAutosave(): Promise<{ data: unknown }> {
  return request('GET', '/api/autosave')
}

/** `keepalive` lets the final save finish while the page is unloading. */
export function putAutosave(data: object, keepalive = false): Promise<{ ok: true }> {
  return request('PUT', '/api/autosave', { data }, { keepalive })
}
