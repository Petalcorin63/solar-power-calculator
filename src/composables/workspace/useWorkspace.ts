/** Account session, auto-save of the working state, and named saved projects. */
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { ApiError, api, type ProjectSummary, type User } from '../../lib/api'
import { defaultProjectState, parseProjectState, type ProjectState } from '../../lib/project'
import { AUTOSAVE_DELAY_MS } from './constants'
import type { AutosaveData, AutosaveStatus, OpenProject, Workspace } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Reads the auto-save blob from the server, which may be old or partial; null if unusable. */
function parseAutosave(raw: unknown): AutosaveData | null {
  if (!isRecord(raw) || !('state' in raw)) return null
  const open = raw.openProject
  return {
    state: parseProjectState(raw.state),
    openProject: isRecord(open) && typeof open.id === 'number' && typeof open.name === 'string'
      ? { id: open.id, name: open.name }
      : null,
  }
}

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong'
}

/**
 * Account session, auto-save of the working state, and named saved projects.
 * `state` is the calculator's current inputs; `restore` replaces them.
 */
export function useWorkspace(state: Readonly<Ref<ProjectState>>, restore: (state: ProjectState) => void): Workspace {
  const user = ref<User | null>(null)
  const projects = ref<ProjectSummary[]>([])
  const openProject = ref<OpenProject | null>(null)
  const autosaveStatus = ref<AutosaveStatus>('off')
  const error = ref<string | null>(null)

  /** Serialized state as of the last save/load of the open project, for the "unsaved changes" flag. */
  const savedJson = ref<string | null>(null)
  const stateJson = computed(() => JSON.stringify(state.value))
  const hasUnsavedChanges = computed(() => openProject.value !== null && savedJson.value !== stateJson.value)

  // ---- Auto-save -----------------------------------------------------------

  let timer: ReturnType<typeof setTimeout> | undefined
  /** True while a session is loading, so an early edit can't overwrite the server copy before it's read. */
  let starting = false

  function autosavePayload(): AutosaveData {
    return { state: state.value, openProject: openProject.value }
  }

  /** Whether another save was scheduled — e.g. by an edit made while a save was in flight. */
  function hasPendingSave(): boolean {
    return timer !== undefined
  }

  async function flushAutosave(keepalive = false): Promise<void> {
    clearTimeout(timer)
    timer = undefined
    if (!user.value) return
    autosaveStatus.value = 'saving'
    try {
      await api.putAutosave(autosavePayload(), keepalive)
      autosaveStatus.value = hasPendingSave() ? 'pending' : 'saved'
    } catch (err) {
      autosaveStatus.value = 'error'
      if (err instanceof ApiError && err.status === 401) user.value = null
    }
  }

  function scheduleAutosave() {
    if (!user.value || starting) return
    autosaveStatus.value = 'pending'
    clearTimeout(timer)
    timer = setTimeout(() => { void flushAutosave() }, AUTOSAVE_DELAY_MS)
  }

  watch([stateJson, openProject], scheduleAutosave)

  // Don't lose the last second of edits when the tab closes.
  function onPageHide() {
    if (hasPendingSave()) void flushAutosave(true)
  }
  window.addEventListener('pagehide', onPageHide)
  onBeforeUnmount(() => { window.removeEventListener('pagehide', onPageHide) })

  // ---- Session -------------------------------------------------------------

  /**
   * Called once a user is known. On page load the auto-save always wins; after an
   * explicit sign-in it only replaces what's on screen if that's untouched defaults
   * or the user agrees, so work done before signing in isn't silently thrown away.
   */
  async function startSession(signedIn: User, mode: 'restore' | 'sign-in' | 'register') {
    user.value = signedIn
    error.value = null
    starting = true
    try {
      const [{ data }] = await Promise.all([api.getAutosave(), refreshProjects()])
      const saved = parseAutosave(data)
      const pristine = stateJson.value === JSON.stringify(defaultProjectState())

      if (saved && (mode === 'restore' || pristine
        || window.confirm('Replace what\'s on screen with your last session from this account?'))) {
        restore(saved.state)
        openProject.value = saved.openProject
        await syncSavedJson()
      }
    } catch (err) {
      error.value = errorMessage(err)
    } finally {
      starting = false
    }
    autosaveStatus.value = 'saved'
    scheduleAutosave()
  }

  async function init() {
    try {
      const { user: current } = await api.me()
      if (current) await startSession(current, 'restore')
    } catch {
      // Server unreachable — the calculator still works without an account.
    }
  }

  async function signIn(email: string, password: string, turnstileToken?: string) {
    const { user: signedIn } = await api.login(email, password, turnstileToken)
    await startSession(signedIn, 'sign-in')
  }

  async function register(email: string, password: string, turnstileToken?: string) {
    const { user: created } = await api.register(email, password, turnstileToken)
    await startSession(created, 'register')
  }

  async function signOut() {
    if (hasPendingSave()) await flushAutosave()
    await api.logout().catch(() => {})
    user.value = null
    projects.value = []
    openProject.value = null
    savedJson.value = null
    autosaveStatus.value = 'off'
  }

  // ---- Saved projects ------------------------------------------------------

  async function refreshProjects() {
    projects.value = (await api.listProjects()).projects
  }

  /** Re-reads the open project so "unsaved changes" is accurate after a reload. */
  async function syncSavedJson() {
    if (!openProject.value) {
      savedJson.value = null
      return
    }
    try {
      const project = await api.getProject(openProject.value.id)
      savedJson.value = JSON.stringify(parseProjectState(project.data))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) openProject.value = null
      savedJson.value = null
    }
  }

  async function run(action: () => Promise<void>) {
    error.value = null
    try {
      await action()
    } catch (err) {
      error.value = errorMessage(err)
    }
  }

  const saveProject = () => run(async () => {
    if (!openProject.value) return
    await api.updateProject(openProject.value.id, { data: state.value })
    savedJson.value = stateJson.value
    await refreshProjects()
  })

  const saveProjectAs = (name: string) => run(async () => {
    const project = await api.createProject(name, state.value)
    openProject.value = { id: project.id, name: project.name }
    savedJson.value = stateJson.value
    await refreshProjects()
  })

  const loadProject = (id: number) => run(async () => {
    if (hasUnsavedChanges.value && !window.confirm('Discard unsaved changes to the open project?')) return
    const project = await api.getProject(id)
    const loaded = parseProjectState(project.data)
    restore(loaded)
    openProject.value = { id: project.id, name: project.name }
    savedJson.value = JSON.stringify(loaded)
  })

  const renameProject = (id: number, name: string) => run(async () => {
    const project = await api.updateProject(id, { name })
    if (openProject.value?.id === id) openProject.value = { id, name: project.name }
    await refreshProjects()
  })

  const deleteProject = (id: number) => run(async () => {
    await api.deleteProject(id)
    if (openProject.value?.id === id) {
      openProject.value = null
      savedJson.value = null
    }
    await refreshProjects()
  })

  /** Detaches from the open project and resets inputs to defaults. */
  function newProject() {
    if (hasUnsavedChanges.value && !window.confirm('Discard unsaved changes to the open project?')) return
    restore(defaultProjectState())
    openProject.value = null
    savedJson.value = null
  }

  return {
    user,
    projects,
    openProject,
    autosaveStatus,
    hasUnsavedChanges,
    error,
    init,
    signIn,
    register,
    signOut,
    saveProject,
    saveProjectAs,
    loadProject,
    renameProject,
    deleteProject,
    newProject,
  }
}

