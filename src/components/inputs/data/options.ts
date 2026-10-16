/** The choices offered by each drop-down and by the system-type picker. */
import type { AcInputSource, OffGridSetup } from '../../../lib/project'
import { BATTERY_LABELS, SYSTEM_TYPE_LABELS, type BatteryChemistry, type HybridSetup, type SystemType, type SystemVoltage } from '../../../lib/sizing'
import { CODE_IDS, ELECTRICAL_CODES, type CodeId } from '../../../lib/wiring'
import type { SelectOption, SystemTypeOption } from '../types'

export const SYSTEM_TYPE_OPTIONS: SystemTypeOption<SystemType>[] = [
  { value: 'off-grid', label: SYSTEM_TYPE_LABELS['off-grid'], description: 'Solar and batteries only — no utility connection.', icon: 'offgrid' },
  { value: 'grid-tied', label: SYSTEM_TYPE_LABELS['grid-tied'], description: 'Solar plus the utility grid — no batteries, off in an outage.', icon: 'gridtied' },
  { value: 'hybrid', label: SYSTEM_TYPE_LABELS.hybrid, description: 'Solar plus the grid, with a battery for outages.', icon: 'hybrid' },
]

export const VOLTAGE_OPTIONS: SelectOption<SystemVoltage>[] = [
  { value: 12, label: '12V' },
  { value: 24, label: '24V' },
  { value: 48, label: '48V' },
]

export const CHEMISTRY_OPTIONS: SelectOption<BatteryChemistry>[] = (Object.keys(BATTERY_LABELS) as BatteryChemistry[])
  .map(value => ({ value, label: BATTERY_LABELS[value] }))

export const OFF_GRID_SETUP_OPTIONS: SelectOption<OffGridSetup>[] = [
  { value: 'separate', label: 'Separate charge controller + inverter' },
  { value: 'all-in-one', label: 'All-in-one inverter (built-in MPPT, e.g. PowMr)' },
]

export const HYBRID_SETUP_OPTIONS: SelectOption<HybridSetup>[] = [
  { value: 'grid-interactive', label: 'Grid-interactive hybrid inverter (can export)' },
  { value: 'all-in-one', label: 'All-in-one inverter on grid input (no export, e.g. PowMr)' },
]

export const AC_INPUT_OPTIONS: SelectOption<AcInputSource>[] = [
  { value: 'none', label: 'None — solar only' },
  { value: 'grid-generator', label: 'Grid or generator connected' },
]

export const CODE_OPTIONS: SelectOption<CodeId>[] = CODE_IDS.map(value => ({ value, label: ELECTRICAL_CODES[value].label }))
