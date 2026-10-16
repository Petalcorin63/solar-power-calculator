<template>
  <div class="flex items-center justify-end gap-3 text-sm">
    <template v-if="workspace.user.value">
      <span class="text-gray-500 dark:text-gray-400 truncate max-w-[14rem]" :title="workspace.user.value.email">
        {{ workspace.user.value.email }}
      </span>
      <button
        type="button"
        class="font-semibold text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
        @click="workspace.signOut()"
      >
        Sign out
      </button>
    </template>
    <button
      v-else
      type="button"
      class="font-semibold text-amber-600 dark:text-amber-400 hover:underline underline-offset-2"
      @click="open('sign-in')"
    >
      Sign in to save projects
    </button>

    <dialog
      ref="dialog"
      class="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xl backdrop:bg-black/40"
      @close="onClose"
    >
      <form class="p-6 space-y-4" @submit.prevent="submit">
        <div class="flex rounded-full border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-950 text-sm">
          <button
            v-for="option in modes"
            :key="option.value"
            type="button"
            class="flex-1 py-1.5 rounded-full font-semibold transition-all"
            :class="mode === option.value ? 'bg-amber-600 text-white' : 'text-gray-500 dark:text-gray-400'"
            @click="mode = option.value; error = null"
          >
            {{ option.label }}
          </button>
        </div>

        <label class="block">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
          <input
            v-model="password"
            type="password"
            required
            :minlength="mode === 'register' ? 8 : undefined"
            maxlength="256"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            class="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
          <p v-if="mode === 'register'" class="mt-1 text-xs text-gray-400">At least 8 characters</p>
        </label>

        <!-- Rendered only while the dialog is open, so the token is fresh when submitted. -->
        <TurnstileWidget
          v-if="TURNSTILE_SITE_KEY && isOpen"
          ref="turnstile"
          v-model="turnstileToken"
          :site-key="TURNSTILE_SITE_KEY"
        />

        <p v-if="error" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ error }}</p>

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            class="px-4 py-2 rounded-full text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
            @click="dialog?.close()"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="busy"
            class="px-5 py-2 rounded-full text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {{ busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in' }}
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Workspace } from '../../composables/workspace'
import { ApiError } from '../../lib/api'
import { TURNSTILE_SITE_KEY } from '../../lib/turnstile'
import TurnstileWidget from './TurnstileWidget.vue'

const props = defineProps<{
  workspace: Workspace
}>()

type Mode = 'sign-in' | 'register'
const modes: { value: Mode, label: string }[] = [
  { value: 'sign-in', label: 'Sign in' },
  { value: 'register', label: 'Create account' },
]

const dialog = ref<HTMLDialogElement | null>(null)
const mode = ref<Mode>('sign-in')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)
const isOpen = ref(false)
const turnstileToken = ref('')
/** The bot-check widget; only its `reset` (exposed by TurnstileWidget) is used here. */
const turnstile = ref<{ reset: () => void } | null>(null)

function open(initial: Mode) {
  mode.value = initial
  error.value = null
  isOpen.value = true
  dialog.value?.showModal()
}

function onClose() {
  error.value = null
  isOpen.value = false
  turnstileToken.value = ''
}

async function submit() {
  if (TURNSTILE_SITE_KEY && !turnstileToken.value) {
    error.value = 'Please complete the “verify you are human” check first'
    return
  }
  busy.value = true
  error.value = null
  const token = turnstileToken.value || undefined
  try {
    if (mode.value === 'register') await props.workspace.register(email.value, password.value, token)
    else await props.workspace.signIn(email.value, password.value, token)
    password.value = ''
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Something went wrong'
    // The server has used up this token; get a new one for the next attempt.
    turnstile.value?.reset()
  } finally {
    busy.value = false
  }
}
</script>
