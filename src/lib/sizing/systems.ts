/** Whole-system calculators: combine the equipment formulas for each system type. */
import { nonNegative } from '../numbers'
import { CONTROLLER_SAFETY_MARGIN, DAYS_PER_YEAR, DEPTH_OF_DISCHARGE, WH_PER_KWH } from './constants'
import {
  arrayWattsForFullLoad,
  arrayWattsForOffset,
  batteryBankAh,
  batteryBankWh,
  batteryLayout,
  controllerAmps,
  estimatedAnnualProductionKwh,
  gridTieInverterWatts,
  installedArrayWatts,
  inverterWattsForPeakLoad,
  panelsNeeded,
} from './equipment'
import { dailyLoadWh, peakLoadW } from './loads'
import type { GridTiedInputs, GridTiedResults, HybridInputs, HybridResults, OffGridInputs, OffGridResults } from './types'

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

export function calculateHybrid(inputs: HybridInputs): HybridResults {
  const exportCapable = inputs.setup !== 'all-in-one'
  const criticalLoad = dailyLoadWh(inputs.criticalAppliances)
  const criticalPeak = peakLoadW(inputs.criticalAppliances)

  // Without export, solar beyond what the backed-up loads use is curtailed, so the
  // array targets their daily use (× the offset share) rather than the whole bill.
  const arrayWattsNeeded = exportCapable
    ? arrayWattsForOffset(inputs.annualUsageKwh, inputs.offsetPercent, inputs.peakSunHours, inputs.systemDerate)
    : arrayWattsForFullLoad(criticalLoad * (nonNegative(inputs.offsetPercent) / 100), inputs.peakSunHours, inputs.systemDerate)
  const panelCount = panelsNeeded(arrayWattsNeeded, inputs.panelWatts)
  const installedWatts = installedArrayWatts(panelCount, inputs.panelWatts)
  const production = estimatedAnnualProductionKwh(installedWatts, inputs.peakSunHours, inputs.systemDerate)
  const dod = DEPTH_OF_DISCHARGE[inputs.batteryChemistry]

  const bankWh = batteryBankWh(criticalLoad, inputs.backupDays, dod)
  const bankAh = batteryBankAh(bankWh, inputs.systemVoltage)

  return {
    arrayWattsNeeded,
    panelCount,
    installedArrayWatts: installedWatts,
    gridTieInverterWatts: exportCapable ? gridTieInverterWatts(installedWatts, inputs.dcAcRatio) : 0,
    estimatedAnnualProductionKwh: production,
    criticalLoadWh: criticalLoad,
    criticalPeakW: criticalPeak,
    batteryBankWh: bankWh,
    batteryBankAh: bankAh,
    batteries: batteryLayout(bankAh, inputs.batteryAh, inputs.systemVoltage, inputs.batteryVoltage),
    backupInverterWatts: inverterWattsForPeakLoad(criticalPeak, inputs.inverterSafetyMargin),
    solarChargerAmps: exportCapable ? null : controllerAmps(installedWatts, inputs.systemVoltage, inputs.controllerSafetyMargin ?? CONTROLLER_SAFETY_MARGIN),
    usableProductionKwh: exportCapable ? production : Math.min(production, (criticalLoad * DAYS_PER_YEAR) / WH_PER_KWH),
  }
}
