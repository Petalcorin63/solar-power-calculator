/**
 * The current each kind of circuit carries — the `CircuitSpec` its breaker and wire are
 * sized from — plus the PV string layout and cold-weather voltage they depend on.
 */
import { nonNegative } from '../numbers'
import { CHARGE_VOLTAGE_FACTOR, INVERTER_EFFICIENCY, LOW_BATTERY_FACTOR, STC_CELL_TEMP_C } from './constants'
import type { CircuitSpec, ElectricalCode, PvLayout } from './types'

export function pvLayout(panelCount: number, panelsPerString: number, panelWatts: number, vmp: number, voc: number, isc: number): PvLayout {
  const count = Math.floor(nonNegative(panelCount))
  const series = Math.min(count, Math.floor(nonNegative(panelsPerString)))
  if (series === 0) {
    return { series: 0, shortestSeries: 0, strings: 0, even: true, stringVmp: 0, shortestStringVmp: 0, stringVoc: 0, arrayIsc: 0, arrayImp: 0 }
  }
  const strings = Math.ceil(count / series)
  const shortestSeries = count % series === 0 ? series : count % series
  const imp = vmp > 0 ? nonNegative(panelWatts) / vmp : 0
  return {
    series,
    shortestSeries,
    strings,
    even: count % series === 0,
    stringVmp: series * nonNegative(vmp),
    shortestStringVmp: shortestSeries * nonNegative(vmp),
    stringVoc: series * nonNegative(voc),
    arrayIsc: strings * nonNegative(isc),
    arrayImp: strings * imp,
  }
}

/** PV output circuit (array to controller/inverter): sized from Isc. */
export function pvCircuit(layout: PvLayout, code: ElectricalCode): CircuitSpec {
  return {
    continuousAmps: layout.arrayIsc * code.pvCurrentFactor,
    operatingAmps: layout.arrayImp,
    // Parallel strings share one voltage, which a short string drags down — use the lowest.
    volts: layout.shortestStringVmp,
    factor: code.pvDesignFactor,
  }
}

/**
 * Open-circuit voltage on the coldest morning. Voc rises as cells get colder:
 * Voc_max = Voc × (1 + γ/100 × (T_min − 25 °C)), with γ the datasheet's Voc temperature
 * coefficient in %/°C (negative). This is the method in the Clean Energy Council's
 * AS/NZS 5033 advice; NEC 690.7(A) also allows the manufacturer's coefficient.
 */
export function coldVoc(vocAt25C: number, tempCoefficientPercent: number, lowestTempC: number): number {
  return nonNegative(vocAt25C) * (1 + (tempCoefficientPercent / 100) * (lowestTempC - STC_CELL_TEMP_C))
}

/**
 * Battery-to-inverter cable: the DC current the inverter pulls at full rated output with
 * the battery nearly flat (at its low-voltage cut-off), which is the worst case.
 */
export function inverterBatteryCircuit(inverterWatts: number, nominalBatteryVolts: number, code: ElectricalCode): CircuitSpec {
  const lowVolts = nonNegative(nominalBatteryVolts) * LOW_BATTERY_FACTOR
  const amps = lowVolts > 0 ? nonNegative(inverterWatts) / (lowVolts * INVERTER_EFFICIENCY) : 0
  return { continuousAmps: amps, operatingAmps: amps, volts: lowVolts, factor: code.continuousFactor }
}

/** AC power a battery charger draws to push `chargeAmps` into the battery while bulk charging. */
export function chargerInputWatts(chargeAmps: number, nominalBatteryVolts: number): number {
  return (nonNegative(chargeAmps) * nonNegative(nominalBatteryVolts) * CHARGE_VOLTAGE_FACTOR) / INVERTER_EFFICIENCY
}

/** Charge controller output to battery: the controller's maximum output current. */
export function chargeCircuit(arrayWatts: number, batteryVolts: number, code: ElectricalCode): CircuitSpec {
  const amps = batteryVolts > 0 ? nonNegative(arrayWatts) / batteryVolts : 0
  return { continuousAmps: amps, operatingAmps: amps, volts: batteryVolts, factor: code.continuousFactor }
}

/** Inverter AC output: rated watts ÷ AC voltage. */
export function acCircuit(inverterWatts: number, acVolts: number, code: ElectricalCode): CircuitSpec {
  const amps = acVolts > 0 ? nonNegative(inverterWatts) / acVolts : 0
  return { continuousAmps: amps, operatingAmps: amps, volts: acVolts, factor: code.continuousFactor }
}
