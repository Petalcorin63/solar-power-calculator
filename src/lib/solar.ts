export interface Appliance {
  id: number
  name: string
  watts: number
  hours: number
  quantity: number
}

export type BatteryChemistry = 'lithium' | 'agm' | 'flooded'

export const BATTERY_LABELS: Record<BatteryChemistry, string> = {
  lithium: 'Lithium (LiFePO4)',
  agm: 'AGM Lead-Acid',
  flooded: 'Flooded Lead-Acid',
}

/** Usable depth of discharge per chemistry — see references panel for sourcing. */
export const DEPTH_OF_DISCHARGE: Record<BatteryChemistry, number> = {
  // The DoD at which LiFePO4 cycle life is commonly rated (e.g. 2,500 cycles at 80%).
  lithium: 0.8,
  agm: 0.5,
  flooded: 0.5,
}

export type SystemVoltage = 12 | 24 | 48

export type SystemType = 'off-grid' | 'grid-tied' | 'hybrid'

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  'off-grid': 'Off-grid',
  'grid-tied': 'Grid-tied',
  hybrid: 'Hybrid',
}

// ---- Shared building blocks ----------------------------------------------

/** Treats blank, NaN, infinite or negative inputs as 0 so bad form input can't poison results. */
function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

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
  const annualTargetWh = nonNegative(annualUsageKwh) * 1000 * (nonNegative(offsetPercent) / 100)
  const divisor = nonNegative(peakSunHours) * 365 * nonNegative(derate)
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
  return (nonNegative(arrayWatts) * nonNegative(peakSunHours) * nonNegative(derate) * 365) / 1000
}

export function batteryBankWh(loadWh: number, days: number, dod: number): number {
  return dod > 0 ? (nonNegative(loadWh) * nonNegative(days)) / dod : 0
}

export function batteryBankAh(bankWh: number, voltage: SystemVoltage): number {
  return voltage > 0 ? nonNegative(bankWh) / voltage : 0
}

export interface BatteryLayout {
  /** Units wired in series per string to reach system voltage. */
  series: number
  /** Parallel strings needed to reach the bank's Ah capacity. */
  parallel: number
  total: number
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

// ---- Off-grid ---------------------------------------------------------

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

export function calculateOffGrid(inputs: OffGridInputs): OffGridResults {
  const load = dailyLoadWh(inputs.appliances)
  const peak = peakLoadW(inputs.appliances)
  const dod = DEPTH_OF_DISCHARGE[inputs.batteryChemistry]

  const arrayWattsNeeded = arrayWattsForFullLoad(load, inputs.peakSunHours, inputs.systemDerate)
  const panelCount = panelsNeeded(arrayWattsNeeded, inputs.panelWatts)
  const installedWatts = installedArrayWatts(panelCount, inputs.panelWatts)
  const bankWh = batteryBankWh(load, inputs.daysOfAutonomy, dod)
  const bankAh = batteryBankAh(bankWh, inputs.systemVoltage)

  return {
    dailyLoadWh: load,
    peakLoadW: peak,
    arrayWattsNeeded,
    panelCount,
    installedArrayWatts: installedWatts,
    batteryBankWh: bankWh,
    batteryBankAh: bankAh,
    batteries: batteryLayout(bankAh, inputs.batteryAh, inputs.systemVoltage, inputs.batteryVoltage),
    chargeControllerAmps: controllerAmps(installedWatts, inputs.systemVoltage, inputs.controllerSafetyMargin),
    inverterWatts: inverterWattsForPeakLoad(peak, inputs.inverterSafetyMargin),
  }
}

// ---- Grid-tied ----------------------------------------------------------

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

export function calculateGridTied(inputs: GridTiedInputs): GridTiedResults {
  const arrayWattsNeeded = arrayWattsForOffset(
    inputs.annualUsageKwh,
    inputs.offsetPercent,
    inputs.peakSunHours,
    inputs.systemDerate,
  )
  const panelCount = panelsNeeded(arrayWattsNeeded, inputs.panelWatts)
  const installedWatts = installedArrayWatts(panelCount, inputs.panelWatts)

  return {
    arrayWattsNeeded,
    panelCount,
    installedArrayWatts: installedWatts,
    inverterWatts: gridTieInverterWatts(installedWatts, inputs.dcAcRatio),
    estimatedAnnualProductionKwh: estimatedAnnualProductionKwh(installedWatts, inputs.peakSunHours, inputs.systemDerate),
  }
}

// ---- Hybrid (grid-tied + battery backup) ---------------------------------

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
}

/**
 * No separate charge controller is sized here: the array is sized to offset the whole
 * household's usage, so "array watts ÷ battery voltage" gives figures like 437 A at
 * 24 V for an 8.4 kW array. Real hybrid systems charge through the hybrid inverter
 * (or AC-couple the battery), so that rating comes from the inverter's spec instead.
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
}

export function calculateHybrid(inputs: HybridInputs): HybridResults {
  const arrayWattsNeeded = arrayWattsForOffset(
    inputs.annualUsageKwh,
    inputs.offsetPercent,
    inputs.peakSunHours,
    inputs.systemDerate,
  )
  const panelCount = panelsNeeded(arrayWattsNeeded, inputs.panelWatts)
  const installedWatts = installedArrayWatts(panelCount, inputs.panelWatts)

  const criticalLoad = dailyLoadWh(inputs.criticalAppliances)
  const criticalPeak = peakLoadW(inputs.criticalAppliances)
  const dod = DEPTH_OF_DISCHARGE[inputs.batteryChemistry]

  const bankWh = batteryBankWh(criticalLoad, inputs.backupDays, dod)
  const bankAh = batteryBankAh(bankWh, inputs.systemVoltage)

  return {
    arrayWattsNeeded,
    panelCount,
    installedArrayWatts: installedWatts,
    gridTieInverterWatts: gridTieInverterWatts(installedWatts, inputs.dcAcRatio),
    estimatedAnnualProductionKwh: estimatedAnnualProductionKwh(installedWatts, inputs.peakSunHours, inputs.systemDerate),
    criticalLoadWh: criticalLoad,
    criticalPeakW: criticalPeak,
    batteryBankWh: bankWh,
    batteryBankAh: bankAh,
    batteries: batteryLayout(bankAh, inputs.batteryAh, inputs.systemVoltage, inputs.batteryVoltage),
    backupInverterWatts: inverterWattsForPeakLoad(criticalPeak, inputs.inverterSafetyMargin),
  }
}
