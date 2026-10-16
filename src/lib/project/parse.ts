/**
 * Loading saved data. It comes back from the server as untrusted JSON (and may predate
 * newer fields), so every field is checked: non-numbers fall back to the default, and
 * out-of-range numbers are clamped (saves from before the form enforced LIMITS can hold
 * e.g. 25 h/day, and 24 is closer to what the user meant than the default).
 */
import { BATTERY_LABELS, SYSTEM_TYPE_LABELS, type Appliance, type BatteryChemistry, type SystemType } from '../sizing'
import { CODE_IDS, ELECTRICAL_CODES } from '../wiring'
import {
  AC_INPUT_SOURCES,
  HYBRID_SETUPS,
  LIMITS,
  MAX_APPLIANCES,
  MAX_APPLIANCE_NAME_LENGTH,
  OFF_GRID_SETUPS,
  SYSTEM_VOLTAGES,
} from './constants'
import { defaultProjectState } from './defaults'
import type { ProjectState, Range } from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberIn(value: unknown, { min, max }: Range, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

/** For fields the user must fill in themselves: anything but a number stays blank. */
function optionalNumberIn(value: unknown, range: Range): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? numberIn(value, range, range.min) : null
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}

function parseAppliances(value: unknown, fallback: Appliance[]): Appliance[] {
  if (!Array.isArray(value)) return fallback
  return value.filter(isObject).slice(0, MAX_APPLIANCES).map((a, index) => ({
    id: index + 1,
    name: typeof a.name === 'string' ? a.name.slice(0, MAX_APPLIANCE_NAME_LENGTH) : 'Appliance',
    watts: numberIn(a.watts, LIMITS.applianceWatts, 0),
    hours: numberIn(a.hours, LIMITS.applianceHours, 0),
    quantity: numberIn(a.quantity, LIMITS.applianceQuantity, 1),
  }))
}

export function parseProjectState(raw: unknown): ProjectState {
  const d = defaultProjectState()
  if (!isObject(raw)) return d

  const systemVoltage = oneOf(raw.systemVoltage, SYSTEM_VOLTAGES, d.systemVoltage)
  const batteryVoltage = oneOf(raw.batteryVoltage, SYSTEM_VOLTAGES, d.batteryVoltage)
  const electricalCode = oneOf(raw.electricalCode, CODE_IDS, d.electricalCode)

  return {
    version: 1,
    systemType: oneOf(raw.systemType, Object.keys(SYSTEM_TYPE_LABELS) as SystemType[], d.systemType),
    appliances: parseAppliances(raw.appliances, d.appliances),
    criticalAppliances: parseAppliances(raw.criticalAppliances, d.criticalAppliances),
    peakSunHours: numberIn(raw.peakSunHours, LIMITS.peakSunHours, d.peakSunHours),
    systemDeratePercent: numberIn(raw.systemDeratePercent, LIMITS.systemDeratePercent, d.systemDeratePercent),
    panelWatts: numberIn(raw.panelWatts, LIMITS.panelWatts, d.panelWatts),
    systemVoltage,
    batteryChemistry: oneOf(raw.batteryChemistry, Object.keys(BATTERY_LABELS) as BatteryChemistry[], d.batteryChemistry),
    batteryAh: numberIn(raw.batteryAh, LIMITS.batteryAh, d.batteryAh),
    batteryVoltage: batteryVoltage > systemVoltage ? systemVoltage : batteryVoltage,
    inverterMarginPercent: numberIn(raw.inverterMarginPercent, LIMITS.inverterMarginPercent, d.inverterMarginPercent),
    daysOfAutonomy: numberIn(raw.daysOfAutonomy, LIMITS.daysOfAutonomy, d.daysOfAutonomy),
    annualUsageKwh: numberIn(raw.annualUsageKwh, LIMITS.annualUsageKwh, d.annualUsageKwh),
    offsetPercent: numberIn(raw.offsetPercent, LIMITS.offsetPercent, d.offsetPercent),
    dcAcRatio: numberIn(raw.dcAcRatio, LIMITS.dcAcRatio, d.dcAcRatio),
    backupDays: numberIn(raw.backupDays, LIMITS.backupDays, d.backupDays),
    electricalCode,
    offGridSetup: oneOf(raw.offGridSetup, OFF_GRID_SETUPS, d.offGridSetup),
    hybridSetup: oneOf(raw.hybridSetup, HYBRID_SETUPS, d.hybridSetup),
    acInputSource: oneOf(raw.acInputSource, AC_INPUT_SOURCES, d.acInputSource),
    acChargeAmps: numberIn(raw.acChargeAmps, LIMITS.acChargeAmps, d.acChargeAmps),
    panelVoc: optionalNumberIn(raw.panelVoc, LIMITS.panelVoc),
    panelVmp: optionalNumberIn(raw.panelVmp, LIMITS.panelVmp),
    panelIsc: optionalNumberIn(raw.panelIsc, LIMITS.panelIsc),
    vocTempCoeffPercent: numberIn(raw.vocTempCoeffPercent, LIMITS.vocTempCoeffPercent, d.vocTempCoeffPercent),
    lowestTempC: optionalNumberIn(raw.lowestTempC, LIMITS.lowestTempC),
    batteryChargeAmps: optionalNumberIn(raw.batteryChargeAmps, LIMITS.batteryChargeAmps),
    panelsPerString: Math.round(numberIn(raw.panelsPerString, LIMITS.panelsPerString, d.panelsPerString)),
    // Each code allows only its own supply voltages (e.g. no 120 V under IEC).
    acVoltage: oneOf(raw.acVoltage, ELECTRICAL_CODES[electricalCode].acVoltages, ELECTRICAL_CODES[electricalCode].defaultAcVoltage),
    maxVoltageDropPercent: numberIn(raw.maxVoltageDropPercent, LIMITS.maxVoltageDropPercent, d.maxVoltageDropPercent),
    pvRunM: optionalNumberIn(raw.pvRunM, LIMITS.runLengthM),
    chargeRunM: optionalNumberIn(raw.chargeRunM, LIMITS.runLengthM),
    batteryRunM: optionalNumberIn(raw.batteryRunM, LIMITS.runLengthM),
    loadRunM: optionalNumberIn(raw.loadRunM, LIMITS.runLengthM),
    gridRunM: optionalNumberIn(raw.gridRunM, LIMITS.runLengthM),
  }
}
