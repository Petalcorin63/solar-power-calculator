/** Number-input behavior shared by NumberField and NumberCell. */
import { computed, ref, watch, type Ref } from 'vue'
import type { NumberBounds, NumberDraft } from './types'

const show = (v: number | null) => (v === null ? '' : String(v))

function rangeText({ min, max }: NumberBounds): string {
  if (min !== undefined && max !== undefined) return `from ${min} to ${max}`
  if (min !== undefined) return `of at least ${min}`
  if (max !== undefined) return `up to ${max}`
  return ''
}

/**
 * The text being typed is kept separately from the model so blank or out-of-range
 * input never reaches it — results keep showing the last valid value until the field
 * is fixed, and blurring restores that value.
 */
export function useNumberDraft(value: Ref<number> | Ref<number | null>, bounds: () => NumberBounds): NumberDraft {
  const model = value as Ref<number | null>
  const draft = ref(show(model.value))
  const invalid = ref(false)

  watch(model, v => {
    if (v === null ? draft.value.trim() !== '' : Number(draft.value) !== v) draft.value = show(v)
    invalid.value = false
  })

  const rangeMessage = computed(() => {
    const b = bounds()
    const kind = b.integer ? 'a whole number' : 'a number'
    return `Enter ${kind} ${rangeText(b)}`.trim()
  })

  function isValid(n: number): boolean {
    const { min, max, integer } = bounds()
    return Number.isFinite(n)
      && (!integer || Number.isInteger(n))
      && (min === undefined || n >= min)
      && (max === undefined || n <= max)
  }

  function onInput(event: Event) {
    draft.value = (event.target as HTMLInputElement).value
    if (bounds().optional && draft.value.trim() === '') {
      invalid.value = false
      model.value = null
      return
    }
    const n = draft.value.trim() === '' ? NaN : Number(draft.value)
    invalid.value = !isValid(n)
    if (!invalid.value) model.value = n
  }

  function onBlur() {
    draft.value = show(model.value)
    invalid.value = false
  }

  return { draft, invalid, rangeMessage, onInput, onBlur }
}
