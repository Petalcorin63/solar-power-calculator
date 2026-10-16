/** Allowed values and ranges for the calculator's inputs. */
import type { HybridSetup, SystemVoltage } from '../sizing'
import type { AcInputSource, OffGridSetup, Range } from './types'

export const OFF_GRID_SETUPS: OffGridSetup[] = ['separate', 'all-in-one']
export const HYBRID_SETUPS: HybridSetup[] = ['grid-interactive', 'all-in-one']
export const AC_INPUT_SOURCES: AcInputSource[] = ['none', 'grid-generator']
export const SYSTEM_VOLTAGES: SystemVoltage[] = [12, 24, 48]

/** Saved appliance lists are cut to this many rows and names to this many characters. */
export const MAX_APPLIANCES = 500
export const MAX_APPLIANCE_NAME_LENGTH = 200

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
  panelVoc: { min: 1, max: 200 },
  panelVmp: { min: 1, max: 200 },
  panelIsc: { min: 0.1, max: 50 },
  panelsPerString: { min: 1, max: 100 },
  vocTempCoeffPercent: { min: -1, max: 0 },
  lowestTempC: { min: -60, max: 40 },
  batteryChargeAmps: { min: 1, max: 2000 },
  maxVoltageDropPercent: { min: 0.5, max: 10 },
  runLengthM: { min: 0.1, max: 1000 },
  acChargeAmps: { min: 0, max: 300 },
  applianceWatts: { min: 0, max: 1e6 },
  applianceHours: { min: 0, max: 24 },
  applianceQuantity: { min: 0, max: 1e4 },
} satisfies Record<string, Range>
