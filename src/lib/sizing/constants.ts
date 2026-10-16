/** Labels and fixed factors for equipment sizing. Sources are cited in the "Formulas & references" panel. */
import type { BatteryChemistry, SystemType } from './types'

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

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  'off-grid': 'Off-grid',
  'grid-tied': 'Grid-tied',
  hybrid: 'Hybrid',
}

/** Charge-controller margin; mirrors the NEC's 125% factor on PV circuit currents. */
export const CONTROLLER_SAFETY_MARGIN = 1.25

export const DAYS_PER_YEAR = 365
export const WH_PER_KWH = 1000
