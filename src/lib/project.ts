import {
  BATTERY_LABELS,
  SYSTEM_TYPE_LABELS,
  dailyLoadWh,
  type Appliance,
  type BatteryChemistry,
  type SystemType,
  type SystemVoltage,
} from './solar'

/** Everything the user can edit — what gets saved to a project or the auto-save. */
export interface ProjectState {
  version: 1
  systemType: SystemType
  appliances: Appliance[]
  criticalAppliances: Appliance[]
  peakSunHours: number
  systemDeratePercent: number
  panelWatts: number
  systemVoltage: SystemVoltage
  batteryChemistry: BatteryChemistry
  batteryAh: number
  batteryVoltage: SystemVoltage
  inverterMarginPercent: number
  daysOfAutonomy: number
  annualUsageKwh: number
  offsetPercent: number
  dcAcRatio: number
  backupDays: number
}

export function defaultProjectState(): ProjectState {
  const appliances: Appliance[] = [
    { id: 1, name: 'LED lights', watts: 10, hours: 5, quantity: 4 },
    { id: 2, name: 'Refrigerator', watts: 150, hours: 8, quantity: 1 },
    { id: 3, name: 'Laptop', watts: 65, hours: 4, quantity: 1 },
  ]
  return {
    version: 1,
    systemType: 'off-grid',
    appliances,
    criticalAppliances: [
      { id: 1, name: 'Refrigerator', watts: 150, hours: 8, quantity: 1 },
      { id: 2, name: 'LED lights', watts: 10, hours: 4, quantity: 3 },
      { id: 3, name: 'Wifi router', watts: 10, hours: 24, quantity: 1 },
    ],
    peakSunHours: 4.5,
    systemDeratePercent: 75,
    panelWatts: 400,
    systemVoltage: 24,
    batteryChemistry: 'lithium',
    batteryAh: 100,
    batteryVoltage: 12,
    inverterMarginPercent: 25,
    daysOfAutonomy: 2,
    annualUsageKwh: Math.round((dailyLoadWh(appliances) * 365) / 1000),
    offsetPercent: 100,
    dcAcRatio: 1.2,
    backupDays: 1,
  }
}

export interface Range { min: number, max: number }

/**
 * Accepted range for every numeric input. The form fields and the saved-data parser
 * both use these, so anything the UI accepts survives a save and reload unchanged.
 */
export const LIMITS = {
  peakSunHours: { min: 0.1, max: 24 },
  systemDeratePercent: { min: 10, max: 100 },
  panelWatts: { min: 1, max: 1e5 },
  batteryAh: { min: 1, max: 1e5 },
  inverterMarginPercent: { min: 0, max: 100 },
  daysOfAutonomy: { min: 0, max: 365 },
  annualUsageKwh: { min: 0, max: 1e8 },
  offsetPercent: { min: 1, max: 200 },
  dcAcRatio: { min: 1, max: 1.5 },
  backupDays: { min: 0, max: 365 },
  applianceWatts: { min: 0, max: 1e6 },
  applianceHours: { min: 0, max: 24 },
  applianceQuantity: { min: 0, max: 1e4 },
} satisfies Record<string, Range>

// ---- Parsing saved data --------------------------------------------------
// Saved data comes back from the server as untrusted JSON (and may predate newer
// fields), so every field is checked: non-numbers fall back to the default, and
// out-of-range numbers are clamped (saves from before the form enforced LIMITS can
// hold e.g. 25 h/day, and 24 is closer to what the user meant than the default).

const VOLTAGES: SystemVoltage[] = [12, 24, 48]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberIn(value: unknown, { min, max }: Range, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}

function parseAppliances(value: unknown, fallback: Appliance[]): Appliance[] {
  if (!Array.isArray(value)) return fallback
  return value.filter(isObject).slice(0, 500).map((a, index) => ({
    id: index + 1,
    name: typeof a.name === 'string' ? a.name.slice(0, 200) : 'Appliance',
    watts: numberIn(a.watts, LIMITS.applianceWatts, 0),
    hours: numberIn(a.hours, LIMITS.applianceHours, 0),
    quantity: numberIn(a.quantity, LIMITS.applianceQuantity, 1),
  }))
}

export function parseProjectState(raw: unknown): ProjectState {
  const d = defaultProjectState()
  if (!isObject(raw)) return d

  const systemVoltage = oneOf(raw.systemVoltage, VOLTAGES, d.systemVoltage)
  const batteryVoltage = oneOf(raw.batteryVoltage, VOLTAGES, d.batteryVoltage)

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
  }
}
