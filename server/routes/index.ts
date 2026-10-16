/** The API routes (auth, projects, autosave) and the built-frontend fallback. */
export type * from './types.js'
export { registerAuthRoutes } from './auth.js'
export { registerProjectRoutes } from './projects.js'
export { registerAutosaveRoutes } from './autosave.js'
export { registerFrontend } from './frontend.js'
