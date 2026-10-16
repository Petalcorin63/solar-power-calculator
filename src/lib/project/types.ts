/** The calculator's inputs — everything the user can edit, saved to projects and the auto-save. */
import type { Appliance, BatteryChemistry, HybridSetup, SystemType, SystemVoltage } from '../sizing'
import type { AcVoltage, CodeId } from '../wiring'

export type OffGridSetup = 'separate' | 'all-in-one'
export type AcInputSource = 'none' | 'grid-generator'

/** One run-length field per circuit in the diagram. */
export type RunLengthKey = 'pvRunM' | 'chargeRunM' | 'batteryRunM' | 'loadRunM' | 'gridRunM'

export interface Range { min: number, max: number }

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
  // Wiring, used by the system diagram. Panel datasheet values and run lengths start
  // blank (null) so no wire size is shown until the user has entered their own.
  /** Which electrical code's tables size wires and breakers. */
  electricalCode: CodeId
  /** Off-grid only: a separate charge controller, or an all-in-one inverter with built-in MPPT. */
  offGridSetup: OffGridSetup
  /** Hybrid only: an exporting hybrid inverter, or an all-in-one inverter-charger fed from the grid. */
  hybridSetup: HybridSetup
  /** All-in-one only: a grid or generator feeding the unit's AC input for backup charging. */
  acInputSource: AcInputSource
  /** All-in-one only: the unit's maximum AC (utility) charging current, battery side. */
  acChargeAmps: number
  panelVoc: number | null
  panelVmp: number | null
  panelIsc: number | null
  /** Datasheet Voc temperature coefficient, %/°C (negative). */
  vocTempCoeffPercent: number
  /** Coldest expected morning at the site, °C — for the cold-weather Voc check. */
  lowestTempC: number | null
  /** Grid-interactive hybrid only: the inverter's maximum battery charge current, from its datasheet. */
  batteryChargeAmps: number | null
  panelsPerString: number
  acVoltage: AcVoltage
  maxVoltageDropPercent: number
  pvRunM: number | null
  chargeRunM: number | null
  batteryRunM: number | null
  loadRunM: number | null
  gridRunM: number | null
}
