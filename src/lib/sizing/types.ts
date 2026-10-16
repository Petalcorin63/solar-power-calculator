/** Shapes for equipment sizing: appliances, system settings, and each calculator's inputs and results. */

export interface Appliance {
  id: number
  name: string
  watts: number
  hours: number
  quantity: number
}

export type BatteryChemistry = 'lithium' | 'agm' | 'flooded'
export type SystemVoltage = 12 | 24 | 48
export type SystemType = 'off-grid' | 'grid-tied' | 'hybrid'

/**
 * `grid-interactive`: a hybrid inverter that can export to the grid, so the array offsets
 * the whole household's usage. `all-in-one`: an off-grid inverter-charger (PowMr, MPP Solar
 * and similar) running from the grid on its AC input — it can't export, so solar only
 * serves the backed-up loads on its output, and the array is sized to those.
 */
export type HybridSetup = 'grid-interactive' | 'all-in-one'

export interface BatteryLayout {
  /** Units wired in series per string to reach system voltage. */
  series: number
  /** Parallel strings needed to reach the bank's Ah capacity. */
  parallel: number
  total: number
}

export interface OffGridInputs {
  appliances: Appliance[]
  peakSunHours: number
  systemDerate: number
  systemVoltage: SystemVoltage
  daysOfAutonomy: number
  batteryChemistry: BatteryChemistry
  panelWatts: number
  batteryAh: number
  batteryVoltage: SystemVoltage
  inverterSafetyMargin: number
  controllerSafetyMargin: number
}

export interface OffGridResults {
  dailyLoadWh: number
  peakLoadW: number
  arrayWattsNeeded: number
  panelCount: number
  installedArrayWatts: number
  batteryBankWh: number
  batteryBankAh: number
  batteries: BatteryLayout
  chargeControllerAmps: number
  inverterWatts: number
}

export interface GridTiedInputs {
  annualUsageKwh: number
  offsetPercent: number
  peakSunHours: number
  systemDerate: number
  panelWatts: number
  dcAcRatio: number
}

export interface GridTiedResults {
  arrayWattsNeeded: number
  panelCount: number
  installedArrayWatts: number
  inverterWatts: number
  estimatedAnnualProductionKwh: number
}

export interface HybridInputs {
  annualUsageKwh: number
  offsetPercent: number
  peakSunHours: number
  systemDerate: number
  panelWatts: number
  dcAcRatio: number
  criticalAppliances: Appliance[]
  backupDays: number
  systemVoltage: SystemVoltage
  batteryChemistry: BatteryChemistry
  batteryAh: number
  batteryVoltage: SystemVoltage
  inverterSafetyMargin: number
  /** Defaults to `grid-interactive`. */
  setup?: HybridSetup
  /** Margin on the all-in-one's built-in solar charger rating (all-in-one only). */
  controllerSafetyMargin?: number
}

/**
 * No separate charge controller is sized for a grid-interactive hybrid: its array is sized
 * to offset the whole household's usage, so "array watts ÷ battery voltage" gives figures
 * like 437 A at 24 V for an 8.4 kW array. Real hybrid systems charge through the hybrid
 * inverter (or AC-couple the battery), so that rating comes from the inverter's spec.
 */
export interface HybridResults {
  arrayWattsNeeded: number
  panelCount: number
  installedArrayWatts: number
  gridTieInverterWatts: number
  estimatedAnnualProductionKwh: number
  criticalLoadWh: number
  criticalPeakW: number
  batteryBankWh: number
  batteryBankAh: number
  batteries: BatteryLayout
  backupInverterWatts: number
  /**
   * All-in-one only: the built-in MPPT charger rating the array needs. With the array sized
   * to the backed-up loads it's a realistic figure, unlike the grid-interactive case above.
   */
  solarChargerAmps: number | null
  /** Solar the household can actually use: all of it if exporting, else only what the backed-up loads consume. */
  usableProductionKwh: number
}
