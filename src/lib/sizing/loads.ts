/** Totals over an appliance list. */
import { nonNegative } from '../numbers'
import type { Appliance } from './types'

export function dailyLoadWh(appliances: Appliance[]): number {
  return appliances.reduce(
    (sum, a) => sum + nonNegative(a.watts) * nonNegative(a.hours) * nonNegative(a.quantity),
    0,
  )
}

/** Worst-case simultaneous draw, assuming every appliance runs at once. */
export function peakLoadW(appliances: Appliance[]): number {
  return appliances.reduce((sum, a) => sum + nonNegative(a.watts) * nonNegative(a.quantity), 0)
}
