<template>
  <div class="relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-900 p-5" :class="t.border">
    <div class="absolute inset-y-0 left-0 w-1" :class="t.bar" aria-hidden="true" />
    <div class="flex items-center gap-2">
      <span v-if="icon" class="inline-flex items-center justify-center w-7 h-7 rounded-lg" :class="t.badge">
        <AppIcon :name="icon" class="w-4 h-4" />
      </span>
      <p class="text-xs font-semibold uppercase tracking-widest" :class="t.text">{{ label }}</p>
    </div>
    <p class="mt-3 text-2xl font-extrabold font-mono text-gray-900 dark:text-white">
      {{ value }}<span v-if="unit" class="ml-1 text-base font-semibold text-gray-400">{{ unit }}</span>
    </p>
    <p v-if="hint" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { TONES, type IconName, type Tone } from '../theme'

const props = withDefaults(defineProps<{
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: Tone
  icon?: IconName
}>(), { tone: 'slate' })

const t = computed(() => TONES[props.tone])
</script>
