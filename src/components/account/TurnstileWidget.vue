<template>
  <div>
    <div ref="container" class="min-h-[65px]" />
    <p v-if="loadError" class="text-xs text-red-600 dark:text-red-400" role="alert">
      Couldn't load the verification check — check your connection or disable content blockers for this site.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { loadTurnstile, type TurnstileApi } from '../../lib/turnstile'

const props = defineProps<{ siteKey: string }>()

/** The current token, or '' while there isn't a valid one. Tokens are single-use. */
const token = defineModel<string>({ required: true })

const container = ref<HTMLElement | null>(null)
const loadError = ref(false)
let api: TurnstileApi | null = null
let widgetId: string | null = null

onMounted(async () => {
  try {
    api = await loadTurnstile()
  } catch {
    loadError.value = true
    return
  }
  if (!container.value) return
  widgetId = api.render(container.value, {
    sitekey: props.siteKey,
    theme: 'auto',
    callback: value => { token.value = value },
    'expired-callback': () => { token.value = '' },
    'error-callback': () => { token.value = '' },
  })
})

onBeforeUnmount(() => {
  if (api && widgetId) api.remove(widgetId)
})

/** Gets a fresh token — needed after every submit, since the server consumes each one. */
function reset() {
  token.value = ''
  if (api && widgetId) api.reset(widgetId)
}

defineExpose({ reset })
</script>
