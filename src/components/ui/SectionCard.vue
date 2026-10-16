<template>
  <section
    class="relative overflow-hidden rounded-3xl border bg-white/90 dark:bg-gray-900/80 shadow-sm shadow-gray-200/60 dark:shadow-none backdrop-blur p-5 sm:p-6"
    :class="t.border"
  >
    <div class="absolute inset-x-0 top-0 h-1" :class="t.bar" aria-hidden="true" />
    <header class="flex items-start gap-3 mb-5">
      <span class="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-2xl" :class="t.badge">
        <AppIcon :name="icon" class="w-5 h-5" />
      </span>
      <div class="min-w-0">
        <h2 class="text-lg font-bold leading-tight">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      </div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { TONES, type IconName, type Tone } from '../theme'

const props = defineProps<{
  title: string
  description?: string
  tone: Tone
  icon: IconName
}>()

const t = computed(() => TONES[props.tone])
</script>
