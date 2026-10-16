/** Number and label formatting for the diagram's explanations. */
import type { BatteryLayout } from '../sizing'
import type { Conductor, ElectricalCode } from '../wiring'

/**
 * Formats with a fixed locale so the explanations read the same everywhere (and in tests).
 * Values that round to zero print as "0", never "-0".
 */
export function fmt(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Number(value.toFixed(digits))
  return (rounded === 0 ? 0 : value).toLocaleString('en-US', { maximumFractionDigits: digits })
}

/** "1 string" / "3 strings". */
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** A conductor as the code names it, with its area alongside AWG sizes. */
export function conductorText(conductor: Conductor | null, code: ElectricalCode): string {
  if (!conductor) return `larger than ${largestConductor(code).size}`
  return conductor.size.endsWith('mm²') ? conductor.size : `${conductor.size} (${fmt(conductor.mm2, 1)} mm²)`
}

export function batteryText(layout: BatteryLayout, ah: number, volts: number): string {
  if (layout.total === 0) return 'none'
  const unit = `${fmt(ah)}Ah ${volts}V`
  return layout.series > 1
    ? `${layout.total} × ${unit} (${layout.series} in series × ${plural(layout.parallel, 'string')})`
    : `${layout.total} × ${unit}`
}

export function largestConductor(code: ElectricalCode): Conductor {
  const last = code.conductors.at(-1)
  if (!last) throw new Error(`${code.id} has no conductor table`)
  return last
}

export function largestBreaker(code: ElectricalCode): number {
  const last = code.breakers.at(-1)
  if (last === undefined) throw new Error(`${code.id} has no breaker table`)
  return last
}
