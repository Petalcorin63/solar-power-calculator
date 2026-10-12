<template>
  <div class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Working on</p>
        <p class="mt-1 font-semibold truncate">
          {{ workspace.openProject.value?.name ?? 'Unsaved draft' }}
          <span
            v-if="workspace.hasUnsavedChanges.value"
            class="ml-1 text-xs font-medium text-amber-600 dark:text-amber-400"
          >· unsaved changes</span>
        </p>
        <p class="mt-0.5 text-xs text-gray-400" aria-live="polite">{{ autosaveLabel }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-if="workspace.openProject.value"
          type="button"
          :class="primaryButton"
          :disabled="!workspace.hasUnsavedChanges.value"
          @click="workspace.saveProject()"
        >
          Save
        </button>
        <button type="button" :class="secondaryButton" @click="startSaveAs">Save as new…</button>
        <button type="button" :class="secondaryButton" @click="workspace.newProject()">New</button>
      </div>
    </div>

    <form v-if="savingAs" class="mt-4 flex gap-2" @submit.prevent="confirmSaveAs">
      <input
        ref="saveAsInput"
        v-model="saveAsName"
        type="text"
        required
        maxlength="100"
        placeholder="Project name"
        aria-label="Project name"
        :class="textInput"
      >
      <button type="submit" :class="primaryButton">Save</button>
      <button type="button" :class="secondaryButton" @click="savingAs = false">Cancel</button>
    </form>

    <p v-if="workspace.error.value" class="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
      {{ workspace.error.value }}
    </p>

    <div class="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
      <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Saved projects</p>
      <p v-if="workspace.projects.value.length === 0" class="text-sm text-gray-400">
        Nothing saved yet — use “Save as new…” to keep this setup.
      </p>
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <li
          v-for="project in workspace.projects.value"
          :key="project.id"
          class="py-2 flex items-center gap-3 text-sm"
        >
          <form
            v-if="renamingId === project.id"
            class="flex-1 flex gap-2"
            @submit.prevent="confirmRename(project.id)"
          >
            <input
              v-model="renameValue"
              type="text"
              required
              maxlength="100"
              aria-label="New project name"
              :class="textInput"
            >
            <button type="submit" :class="linkButton">Save</button>
            <button type="button" :class="linkButton" @click="renamingId = null">Cancel</button>
          </form>
          <template v-else>
            <div class="flex-1 min-w-0">
              <p class="truncate" :class="{ 'font-semibold': project.id === workspace.openProject.value?.id }">
                {{ project.name }}
              </p>
              <p class="text-xs text-gray-400">Updated {{ formatDate(project.updatedAt) }}</p>
            </div>
            <button
              v-if="project.id !== workspace.openProject.value?.id"
              type="button"
              :class="linkButton"
              @click="workspace.loadProject(project.id)"
            >
              Open
            </button>
            <button type="button" :class="linkButton" @click="startRename(project.id, project.name)">Rename</button>
            <button
              type="button"
              class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-semibold"
              @click="confirmDelete(project.id, project.name)"
            >
              Delete
            </button>
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { Workspace } from '../composables/useWorkspace'

const props = defineProps<{
  workspace: Workspace
}>()

const primaryButton = 'px-4 py-2 rounded-full text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-amber-600'
const secondaryButton = 'px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400'
const linkButton = 'text-amber-600 dark:text-amber-400 font-semibold hover:underline underline-offset-2'
const textInput = 'flex-1 min-w-0 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'

const autosaveLabel = computed(() => ({
  off: '',
  pending: 'Auto-saving…',
  saving: 'Auto-saving…',
  saved: 'All changes auto-saved to your account',
  error: 'Auto-save failed — will retry on your next change',
})[props.workspace.autosaveStatus.value])

const savingAs = ref(false)
const saveAsName = ref('')
const saveAsInput = ref<HTMLInputElement | null>(null)

async function startSaveAs() {
  saveAsName.value = props.workspace.openProject.value ? `${props.workspace.openProject.value.name} (copy)` : ''
  savingAs.value = true
  await nextTick()
  saveAsInput.value?.focus()
}

async function confirmSaveAs() {
  await props.workspace.saveProjectAs(saveAsName.value.trim())
  if (!props.workspace.error.value) savingAs.value = false
}

const renamingId = ref<number | null>(null)
const renameValue = ref('')

function startRename(id: number, name: string) {
  renamingId.value = id
  renameValue.value = name
}

async function confirmRename(id: number) {
  await props.workspace.renameProject(id, renameValue.value.trim())
  if (!props.workspace.error.value) renamingId.value = null
}

function confirmDelete(id: number, name: string) {
  if (window.confirm(`Delete “${name}”? This can't be undone.`)) void props.workspace.deleteProject(id)
}

function formatDate(sqliteUtc: string): string {
  // SQLite's datetime('now') is UTC without a zone marker.
  const date = new Date(`${sqliteUtc.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime())
    ? sqliteUtc
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>
