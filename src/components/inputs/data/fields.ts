/**
 * Label, unit, hint and bounds of every number input. The Setup tab and the diagram's
 * "fill these in" boxes both render fields from here, so they always read the same.
 */
import { LIMITS } from '../../../lib/project'
import type { FieldKey } from '../../../lib/diagram'
import type { NumberFieldConfig } from '../types'

const runLength = (hint: string): NumberFieldConfig => ({
  label: 'Cable length (one way)',
  suffix: 'm',
  hint,
  step: 0.5,
  placeholder: 'e.g. 10',
  ...LIMITS.runLengthM,
})

/** Values the user must supply themselves (datasheet values, cable lengths): blank until filled in. */
export const OPTIONAL_FIELDS = {
  panelVoc: { label: 'Open-circuit voltage (Voc)', suffix: 'V', hint: 'Panel voltage with nothing connected, from the datasheet (≈ 37 V for a typical 400 W panel)', step: 0.1, placeholder: 'from datasheet', ...LIMITS.panelVoc },
  panelVmp: { label: 'Max-power voltage (Vmp)', suffix: 'V', hint: 'Panel voltage while producing full power, from the datasheet (≈ 31 V for a typical 400 W panel)', step: 0.1, placeholder: 'from datasheet', ...LIMITS.panelVmp },
  panelIsc: { label: 'Short-circuit current (Isc)', suffix: 'A', hint: 'Most current one panel can deliver, from the datasheet (≈ 13.9 A for a typical 400 W panel)', step: 0.1, placeholder: 'from datasheet', ...LIMITS.panelIsc },
  lowestTempC: { label: 'Coldest morning at your site', suffix: '°C', hint: 'The lowest temperature recorded for your area — panel voltage peaks then', step: 1, placeholder: 'e.g. -2', ...LIMITS.lowestTempC },
  batteryChargeAmps: { label: 'Inverter’s max battery charge current', suffix: 'A', hint: 'From the hybrid inverter’s datasheet — the most it can push into the battery', step: 5, placeholder: 'from datasheet', ...LIMITS.batteryChargeAmps },
  pvRunM: runLength('From the panels to the controller or inverter'),
  chargeRunM: runLength('From the charge controller to the battery'),
  batteryRunM: runLength('From the battery to the inverter'),
  loadRunM: runLength('From the inverter to the breaker box it feeds'),
  gridRunM: runLength('From the inverter to the main breaker box'),
} satisfies Partial<Record<FieldKey, NumberFieldConfig>>

/** Number inputs that always have a value (they start from a sensible default). */
export const NUMBER_FIELDS = {
  peakSunHours: { label: 'Peak sun hours', suffix: 'hrs/day', hint: 'Hours of full-strength sun per day at your location — look it up with PVWatts (see Formulas & references)', step: 0.1, ...LIMITS.peakSunHours },
  systemDeratePercent: { label: 'System efficiency (derate)', suffix: '%', hint: 'Share of the panels’ rated output you actually get after wiring, heat and inverter losses', step: 1, ...LIMITS.systemDeratePercent },
  panelWatts: { label: 'Panel wattage', suffix: 'W / panel', hint: 'The rated power on the panel’s label or datasheet', ...LIMITS.panelWatts },
  dcAcRatio: { label: 'Panel-to-inverter ratio (DC:AC)', hint: 'Total panel watts ÷ inverter watts — usually 1.1 to 1.3', step: 0.05, ...LIMITS.dcAcRatio },
  annualUsageKwh: { label: 'Yearly electricity use', suffix: 'kWh/yr', hint: 'From your utility bill', ...LIMITS.annualUsageKwh },
  offsetPercent: { label: 'Share covered by solar', suffix: '%', hint: '100% aims to produce as much as you use over a year', step: 5, ...LIMITS.offsetPercent },
  batteryAh: { label: 'Capacity of one battery', suffix: 'Ah', hint: 'The amp-hour rating on the battery’s label or datasheet', ...LIMITS.batteryAh },
  daysOfAutonomy: { label: 'Days without sun to cover', suffix: 'days', hint: 'How many cloudy days the batteries alone should last (days of autonomy)', step: 0.5, ...LIMITS.daysOfAutonomy },
  backupDays: { label: 'Outage length to cover', suffix: 'days', hint: 'How long the battery should run the critical loads without grid power', step: 0.5, ...LIMITS.backupDays },
  inverterMarginPercent: { label: 'Inverter headroom', suffix: '%', hint: 'Extra capacity above the peak load, so the inverter isn’t run flat out', step: 5, ...LIMITS.inverterMarginPercent },
  vocTempCoeffPercent: { label: 'Voc temperature coefficient', suffix: '%/°C', hint: 'From the panel datasheet — typically −0.25 to −0.30 %/°C', step: 0.01, ...LIMITS.vocTempCoeffPercent },
  panelsPerString: { label: 'Panels in series (per string)', suffix: 'panels', integer: true, hint: 'Keep string voltage within your controller/inverter input range', step: 1, ...LIMITS.panelsPerString },
  acChargeAmps: { label: 'AC charging current', suffix: 'A', hint: 'The unit’s "max utility/AC charging current" setting, battery side — 30 A is a common default', step: 5, ...LIMITS.acChargeAmps },
  maxVoltageDropPercent: { label: 'Allowed voltage loss', suffix: '%', hint: 'Voltage lost along the cable — 2–3% is a common target', step: 0.5, ...LIMITS.maxVoltageDropPercent },
} satisfies Partial<Record<FieldKey, NumberFieldConfig>>
