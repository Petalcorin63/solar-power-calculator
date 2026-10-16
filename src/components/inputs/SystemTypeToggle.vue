<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="System type">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="value === option.value"
      class="group flex items-start gap-3 text-left rounded-2xl border-2 p-4 transition-all"
      :class="value === option.value
        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-md shadow-amber-200/50 dark:shadow-none'
        : 'border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 hover:border-amber-300 dark:hover:border-amber-700'"
      @click="value = option.value"
    >
      <span
        class="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
        :class="value === option.value
          ? 'bg-amber-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:text-amber-600'"
      >
        <AppIcon :name="option.icon" class="w-5 h-5" />
      </span>
      <span class="min-w-0">
        <span class="block font-bold">{{ option.label }}</span>
        <span class="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ option.description }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { AppIcon } from '../ui'
import type { SystemTypeOption } from './types'

const value = defineModel<T>({ required: true })

defineProps<{
  options: SystemTypeOption<T>[]
}>()
</script>
