<template>
  <label class="block">
    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</span>
    <select
      v-model="value"
      class="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts" generic="T extends string | number">
const value = defineModel<T>({ required: true })

defineProps<{
  label: string
  options: { value: T, label: string }[]
}>()
</script>
