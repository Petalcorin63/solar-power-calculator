/**
 * Maps the saved inputs onto each sizing calculator's arguments. Shared by the results
 * cards and the system diagram so both show the same numbers.
 */
import { CONTROLLER_SAFETY_MARGIN, type GridTiedInputs, type HybridInputs, type OffGridInputs } from '../sizing'
import type { ProjectState } from './types'

/** Inverter headroom as a multiplier: 25% → 1.25. */
function inverterMargin(s: ProjectState): number {
  return 1 + s.inverterMarginPercent / 100
}

export function offGridInputs(s: ProjectState): OffGridInputs {
  return {
    appliances: s.appliances,
    peakSunHours: s.peakSunHours,
    systemDerate: s.systemDeratePercent / 100,
    systemVoltage: s.systemVoltage,
    daysOfAutonomy: s.daysOfAutonomy,
    batteryChemistry: s.batteryChemistry,
    panelWatts: s.panelWatts,
    batteryAh: s.batteryAh,
    batteryVoltage: s.batteryVoltage,
    inverterSafetyMargin: inverterMargin(s),
    controllerSafetyMargin: CONTROLLER_SAFETY_MARGIN,
  }
}

export function gridTiedInputs(s: ProjectState): GridTiedInputs {
  return {
    annualUsageKwh: s.annualUsageKwh,
    offsetPercent: s.offsetPercent,
    peakSunHours: s.peakSunHours,
    systemDerate: s.systemDeratePercent / 100,
    panelWatts: s.panelWatts,
    dcAcRatio: s.dcAcRatio,
  }
}

export function hybridInputs(s: ProjectState): HybridInputs {
  return {
    ...gridTiedInputs(s),
    criticalAppliances: s.criticalAppliances,
    backupDays: s.backupDays,
    systemVoltage: s.systemVoltage,
    batteryChemistry: s.batteryChemistry,
    batteryAh: s.batteryAh,
    batteryVoltage: s.batteryVoltage,
    inverterSafetyMargin: inverterMargin(s),
    setup: s.hybridSetup,
    controllerSafetyMargin: CONTROLLER_SAFETY_MARGIN,
  }
}
