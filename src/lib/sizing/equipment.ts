/** One formula per piece of equipment: panels, batteries, charge controller, inverters. */
import { nonNegative } from '../numbers'
import { DAYS_PER_YEAR, WH_PER_KWH } from './constants'
import type { BatteryLayout, SystemVoltage } from './types'

/** Off-grid sizing: the array must cover the entire daily load itself. */
export function arrayWattsForFullLoad(dailyWh: number, peakSunHours: number, derate: number): number {
  const divisor = nonNegative(peakSunHours) * nonNegative(derate)
  return divisor > 0 ? nonNegative(dailyWh) / divisor : 0
}

/** Grid-tied/hybrid sizing: the array only needs to offset a target share of annual usage. */
export function arrayWattsForOffset(
  annualUsageKwh: number,
  offsetPercent: number,
  peakSunHours: number,
  derate: number,
): number {
  const annualTargetWh = nonNegative(annualUsageKwh) * WH_PER_KWH * (nonNegative(offsetPercent) / 100)
  const divisor = nonNegative(peakSunHours) * DAYS_PER_YEAR * nonNegative(derate)
  return divisor > 0 ? annualTargetWh / divisor : 0
}

export function panelsNeeded(arrayWatts: number, panelWatts: number): number {
  return panelWatts > 0 ? Math.ceil(nonNegative(arrayWatts) / panelWatts) : 0
}

/**
 * What actually goes on the roof: whole panels, so usually more than the calculated minimum.
 * Downstream equipment (charge controller, grid-tie inverter) is sized to this, not the minimum.
 */
export function installedArrayWatts(panelCount: number, panelWatts: number): number {
  return nonNegative(panelCount) * nonNegative(panelWatts)
}

export function estimatedAnnualProductionKwh(arrayWatts: number, peakSunHours: number, derate: number): number {
  return (nonNegative(arrayWatts) * nonNegative(peakSunHours) * nonNegative(derate) * DAYS_PER_YEAR) / WH_PER_KWH
}

export function batteryBankWh(loadWh: number, days: number, dod: number): number {
  return dod > 0 ? (nonNegative(loadWh) * nonNegative(days)) / dod : 0
}

export function batteryBankAh(bankWh: number, voltage: SystemVoltage): number {
  return voltage > 0 ? nonNegative(bankWh) / voltage : 0
}

/**
 * Units are wired in series up to the system voltage; each string then provides the
 * unit's Ah at system voltage, so the bank's Ah sets the number of parallel strings.
 */
export function batteryLayout(
  bankAh: number,
  unitAh: number,
  systemVoltage: SystemVoltage,
  unitVoltage: SystemVoltage,
): BatteryLayout {
  if (!(unitAh > 0) || !(unitVoltage > 0) || unitVoltage > systemVoltage || !(bankAh > 0)) {
    return { series: 0, parallel: 0, total: 0 }
  }
  const series = Math.ceil(systemVoltage / unitVoltage)
  const parallel = Math.ceil(bankAh / unitAh)
  return { series, parallel, total: series * parallel }
}

/** MPPT charge controller sizing, with a safety margin above continuous rating. */
export function controllerAmps(arrayWatts: number, voltage: SystemVoltage, margin: number): number {
  return voltage > 0 ? (nonNegative(arrayWatts) / voltage) * nonNegative(margin) : 0
}

export function inverterWattsForPeakLoad(peakW: number, margin: number): number {
  return nonNegative(peakW) * nonNegative(margin)
}

/** Grid-tie inverters are commonly undersized relative to array watts (DC:AC / inverter loading ratio). */
export function gridTieInverterWatts(arrayWatts: number, dcAcRatio: number): number {
  return dcAcRatio > 0 ? nonNegative(arrayWatts) / dcAcRatio : 0
}
