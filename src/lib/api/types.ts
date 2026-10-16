/** Shapes the server's API returns (routes live in server/routes/). */

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
