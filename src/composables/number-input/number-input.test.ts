import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useNumberDraft, type NumberBounds } from '.'

/** Simulates typing `text` into the field. */
function type(draft: ReturnType<typeof useNumberDraft>, text: string) {
  draft.onInput({ target: { value: text } } as unknown as Event)
}

describe('useNumberDraft', () => {
  it('keeps the last valid value when the input is blank or out of range', () => {
    const value = ref(10)
    const draft = useNumberDraft(value, () => ({ min: 1, max: 100 }))
    type(draft, '')
    expect([value.value, draft.invalid.value]).toEqual([10, true])
    type(draft, '500')
    expect([value.value, draft.invalid.value]).toEqual([10, true])
    type(draft, '42')
    expect([value.value, draft.invalid.value]).toEqual([42, false])
  })

  it('rejects fractions in whole-number fields, so the model never holds 7.6 panels', () => {
    const value = ref(10)
    const bounds: NumberBounds = { min: 1, max: 100, integer: true }
    const draft = useNumberDraft(value, () => bounds)
    type(draft, '7.6')
    expect([value.value, draft.invalid.value]).toEqual([10, true])
    expect(draft.rangeMessage.value).toBe('Enter a whole number from 1 to 100')
    type(draft, '8')
    expect(value.value).toBe(8)
  })

  it('lets optional fields go blank, setting the model to null', () => {
    const value = ref<number | null>(13.9)
    const draft = useNumberDraft(value, () => ({ min: 0.1, max: 50, optional: true }))
    type(draft, '')
    expect([value.value, draft.invalid.value]).toEqual([null, false])
  })
})
