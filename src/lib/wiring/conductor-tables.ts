/** Builders the regional data files use to turn published table values into `Conductor`s. */
import { CONDUCTOR_TEMP_C, COPPER_TEMP_COEFFICIENT, METERS_PER_KFT } from './constants'
import { IEC_RESISTANCE_20C } from './data/iec-60228'
import type { Conductor } from './types'

/** Converts a US table's Ω per 1,000 ft to Ω per km. */
export function ohmsPerKmFromKft(ohmsPerKft: number): number {
  return (ohmsPerKft * 1000) / METERS_PER_KFT
}

/** Corrects a resistance listed at 20 °C to the 75 °C the sizing uses. */
export function resistanceAt75C(ohmsPerKmAt20C: number): number {
  return ohmsPerKmAt20C * (1 + COPPER_TEMP_COEFFICIENT * (CONDUCTOR_TEMP_C - 20))
}

function iecResistanceAt75C(mm2: number): number {
  const at20 = IEC_RESISTANCE_20C[mm2]
  if (at20 === undefined) throw new Error(`No IEC 60228 resistance listed for ${mm2} mm²`)
  return resistanceAt75C(at20)
}

/** Builds a metric conductor table from { size in mm²: ampacity }, with IEC 60228 resistances. */
export function metricConductors(ampacities: Record<number, number>): Conductor[] {
  return Object.entries(ampacities)
    .map(([mm2, ampacity]) => ({
      size: `${mm2} mm²`,
      mm2: Number(mm2),
      ampacity,
      maxOcpd: ampacity,
      ohmsPerKm: iecResistanceAt75C(Number(mm2)),
    }))
    .sort((a, b) => a.mm2 - b.mm2)
}
