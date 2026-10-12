import { computed, ref, watch, type Ref } from 'vue'

export interface NumberBounds {
  min?: number
  max?: number
}

/**
 * The text being typed is kept separately from the model so blank or out-of-range
 * input never reaches it — results keep showing the last valid value until the field
 * is fixed, and blurring restores that value.
 */
export function useNumberDraft(value: Ref<number>, bounds: () => NumberBounds) {
  const draft = ref(String(value.value))
  const invalid = ref(false)

  watch(value, v => {
    if (Number(draft.value) !== v) draft.value = String(v)
    invalid.value = false
  })

  const rangeMessage = computed(() => {
    const { min, max } = bounds()
    if (min !== undefined && max !== undefined) return `Enter a number from ${min} to ${max}`
    if (min !== undefined) return `Enter a number of at least ${min}`
    if (max !== undefined) return `Enter a number up to ${max}`
    return 'Enter a number'
  })

  function isValid(n: number): boolean {
    const { min, max } = bounds()
    return Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max)
  }

  function onInput(event: Event) {
    draft.value = (event.target as HTMLInputElement).value
    const n = draft.value.trim() === '' ? NaN : Number(draft.value)
    invalid.value = !isValid(n)
    if (!invalid.value) value.value = n
  }

  function onBlur() {
    draft.value = String(value.value)
    invalid.value = false
  }

  return { draft, invalid, rangeMessage, onInput, onBlur }
}
