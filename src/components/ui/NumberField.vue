<template>
  <label class="block">
    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</span>
    <span
      v-if="optional && value === null"
      class="ml-1.5 inline-block w-2 h-2 rounded-full bg-red-500 align-middle"
      title="Needed for wire sizing"
    ><span class="sr-only">(needed)</span></span>
    <div class="mt-1.5 relative">
      <input
        :value="draft"
        type="number"
        :min="min"
        :max="max"
        :step="step"
        :placeholder="placeholder"
        :aria-invalid="invalid"
        class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border text-sm font-mono focus:outline-none focus:ring-2 focus:border-transparent"
        :class="invalid
          ? 'border-red-400 dark:border-red-500 focus:ring-red-500'
          : optional && value === null
            ? 'border-red-300 dark:border-red-800 focus:ring-amber-500'
            : 'border-gray-200 dark:border-gray-700 focus:ring-amber-500'"
        @input="onInput"
        @blur="onBlur"
      >
      <span
        v-if="suffix"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
      >{{ suffix }}</span>
    </div>
    <p v-if="invalid" class="mt-1 text-xs text-red-500">{{ rangeMessage }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</p>
  </label>
</template>

<script setup lang="ts" generic="T extends number | null">
import { useNumberDraft } from '../../composables/number-input'

const value = defineModel<T>({ required: true })

const props = defineProps<{
  label: string
  suffix?: string
  hint?: string
  min?: number
  max?: number
  step?: number
  /** Allow blank (null): the field is something the user must fill in themselves. */
  optional?: boolean
  /** Only whole numbers are accepted. */
  integer?: boolean
  placeholder?: string
}>()

const { draft, invalid, rangeMessage, onInput, onBlur } = useNumberDraft(value, () => props)
</script>
