/** Shapes for the account, auto-save and saved-projects layer. */
import type { ComputedRef, Ref } from 'vue'
import type { ProjectSummary, User } from '../../lib/api'
import type { ProjectState } from '../../lib/project'

export type AutosaveStatus = 'off' | 'pending' | 'saving' | 'saved' | 'error'

export interface OpenProject {
  id: number
  name: string
}

/** Shape of the auto-save blob: the working state plus which saved project it came from. */
export interface AutosaveData {
  state: ProjectState
  openProject: OpenProject | null
}

/** What the account, auto-save and saved-projects layer offers to the UI. */
export interface Workspace {
  user: Ref<User | null>
  projects: Ref<ProjectSummary[]>
  /** The saved project the current inputs came from, if any. */
  openProject: Ref<OpenProject | null>
  autosaveStatus: Ref<AutosaveStatus>
  /** True when the inputs differ from the open project's last save. */
  hasUnsavedChanges: ComputedRef<boolean>
  /** Last error from a project action, shown in the projects panel. */
  error: Ref<string | null>
  /** Restores the session on page load, if the browser is still signed in. */
  init: () => Promise<void>
  signIn: (email: string, password: string, turnstileToken?: string) => Promise<void>
  register: (email: string, password: string, turnstileToken?: string) => Promise<void>
  signOut: () => Promise<void>
  saveProject: () => Promise<void>
  saveProjectAs: (name: string) => Promise<void>
  loadProject: (id: number) => Promise<void>
  renameProject: (id: number, name: string) => Promise<void>
  deleteProject: (id: number) => Promise<void>
  /** Detaches from the open project and resets inputs to defaults. */
  newProject: () => void
}
