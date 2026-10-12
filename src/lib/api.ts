export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(method: string, url: string, body?: unknown, init?: RequestInit): Promise<T> {
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

export interface User {
  id: number
  email: string
}

export interface ProjectSummary {
  id: number
  name: string
  updatedAt: string
}

export interface Project extends ProjectSummary {
  data: unknown
}

export const api = {
  me: () => request<{ user: User | null }>('GET', '/api/auth/me'),
  register: (email: string, password: string, turnstileToken?: string) =>
    request<{ user: User }>('POST', '/api/auth/register', { email, password, turnstileToken }),
  login: (email: string, password: string, turnstileToken?: string) =>
    request<{ user: User }>('POST', '/api/auth/login', { email, password, turnstileToken }),
  logout: () => request<{ ok: true }>('POST', '/api/auth/logout'),

  listProjects: () => request<{ projects: ProjectSummary[] }>('GET', '/api/projects'),
  getProject: (id: number) => request<Project>('GET', `/api/projects/${id}`),
  createProject: (name: string, data: object) => request<Project>('POST', '/api/projects', { name, data }),
  updateProject: (id: number, changes: { name?: string, data?: object }) =>
    request<Project>('PUT', `/api/projects/${id}`, changes),
  deleteProject: (id: number) => request<{ ok: true }>('DELETE', `/api/projects/${id}`),

  getAutosave: () => request<{ data: unknown }>('GET', '/api/autosave'),
  /** `keepalive` lets the final save finish while the page is unloading. */
  putAutosave: (data: object, keepalive = false) =>
    request<{ ok: true }>('PUT', '/api/autosave', { data }, { keepalive }),
}
