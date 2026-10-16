/**
 * Sizing a breaker and the wire it protects. The wire must be rated for at least the
 * breaker and keep voltage drop within the limit — whichever needs the thicker wire wins.
 */
import { nonNegative } from '../numbers'
import type { BreakerSizing, CircuitSpec, Conductor, ElectricalCode, WireSizing } from './types'

/** Smallest standard breaker at or above `amps`; null above the code's largest rating. */
export function nextStandardBreaker(amps: number, code: ElectricalCode): number | null {
  return code.breakers.find(rating => rating >= nonNegative(amps)) ?? null
}

/** Smallest conductor that a breaker of this rating may protect; null if beyond the table. */
export function conductorForBreaker(breakerAmps: number, code: ElectricalCode): Conductor | null {
  return code.conductors.find(c => c.maxOcpd >= nonNegative(breakerAmps)) ?? null
}

/** Voltage drop over the out-and-back run, as a percentage of circuit voltage. */
export function voltageDropPercent(conductor: Conductor, amps: number, oneWayMeters: number, volts: number): number {
  if (!(volts > 0)) return 0
  const ohms = (2 * nonNegative(oneWayMeters) * conductor.ohmsPerKm) / 1000
  return ((nonNegative(amps) * ohms) / volts) * 100
}

/** Smallest conductor keeping voltage drop within `maxPercent`; null if beyond the table. */
export function conductorForVoltageDrop(amps: number, oneWayMeters: number, volts: number, maxPercent: number, code: ElectricalCode): Conductor | null {
  return code.conductors.find(c => voltageDropPercent(c, amps, oneWayMeters, volts) <= nonNegative(maxPercent)) ?? null
}

export function sizeBreaker(spec: CircuitSpec, code: ElectricalCode): BreakerSizing {
  const designAmps = nonNegative(spec.continuousAmps) * nonNegative(spec.factor)
  return { designAmps, breakerAmps: nextStandardBreaker(designAmps, code) }
}

export function sizeWire(spec: CircuitSpec, oneWayMeters: number, maxDropPercent: number, code: ElectricalCode): WireSizing {
  const breaker = sizeBreaker(spec, code)
  const byAmpacity = breaker.breakerAmps === null ? null : conductorForBreaker(breaker.breakerAmps, code)
  const byVoltageDrop = conductorForVoltageDrop(spec.operatingAmps, oneWayMeters, spec.volts, maxDropPercent, code)
  const list = code.conductors
  const conductor = byAmpacity && byVoltageDrop
    ? list[Math.max(list.indexOf(byAmpacity), list.indexOf(byVoltageDrop))] ?? null
    : null
  return {
    ...breaker,
    byAmpacity,
    byVoltageDrop,
    conductor,
    dropPercent: conductor ? voltageDropPercent(conductor, spec.operatingAmps, oneWayMeters, spec.volts) : 0,
  }
}
