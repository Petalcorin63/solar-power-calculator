/** Shapes for the calculator's input fields. */
import type { IconName } from '../theme'

/** How a number input is labelled and bounded. */
export interface NumberFieldConfig {
  label: string
  suffix?: string
  hint?: string
  min: number
  max: number
  step?: number
  placeholder?: string
  integer?: boolean
}

export interface SelectOption<T extends string | number> {
  value: T
  label: string
}

/** A card in the system-type picker. */
export interface SystemTypeOption<T extends string> extends SelectOption<T> {
  description: string
  icon: IconName
}
