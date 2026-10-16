/** Shapes for number inputs: what a field accepts, and the state it exposes. */
import type { ComputedRef, Ref } from 'vue'

export interface NumberBounds {
  min?: number
  max?: number
  /** Blank is allowed and sets the model to null — for values only the user can supply. */
  optional?: boolean
  /** Only whole numbers are accepted (e.g. a count of panels). */
  integer?: boolean
}

/** Reactive state and handlers for one number input; see `useNumberDraft`. */
export interface NumberDraft {
  /** The text in the input, which may be invalid. */
  draft: Ref<string>
  invalid: Ref<boolean>
  /** Message shown while `invalid`, e.g. "Enter a whole number from 1 to 100". */
  rangeMessage: ComputedRef<string>
  onInput: (event: Event) => void
  onBlur: () => void
}
