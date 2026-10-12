<template>
  <div class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
    <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">{{ label }}</p>
    <p class="mt-2 text-2xl font-extrabold font-mono text-gray-900 dark:text-white">
      {{ value }}<span v-if="unit" class="ml-1 text-base font-semibold text-gray-400">{{ unit }}</span>
    </p>
    <p v-if="hint" class="mt-1.5 text-xs text-gray-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  unit?: string
  hint?: string
}>()
</script>
