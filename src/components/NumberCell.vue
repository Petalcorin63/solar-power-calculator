<template>
  <span class="inline-block">
    <input
      :value="draft"
      type="number"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="label"
      :aria-invalid="invalid"
      class="w-full text-right bg-transparent font-mono focus:outline-none rounded"
      :class="invalid ? 'ring-2 ring-red-400 dark:ring-red-500' : ''"
      @input="onInput"
      @blur="onBlur"
    >
    <span v-if="invalid" class="block mt-1 text-xs text-red-500 text-right whitespace-nowrap">{{ rangeMessage }}</span>
  </span>
</template>

<script setup lang="ts">
import { useNumberDraft } from '../composables/useNumberDraft'

const value = defineModel<number>({ required: true })

const props = defineProps<{
  label: string
  min?: number
  max?: number
  step?: number
}>()

const { draft, invalid, rangeMessage, onInput, onBlur } = useNumberDraft(value, () => props)
</script>
