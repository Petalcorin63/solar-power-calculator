<template>
  <div class="inline-flex rounded-full border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="px-5 py-2 rounded-full text-sm font-semibold transition-all"
      :class="value === option.value
        ? 'bg-amber-600 text-white'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
      @click="value = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
const value = defineModel<T>({ required: true })

defineProps<{
  options: { value: T, label: string }[]
}>()
</script>
