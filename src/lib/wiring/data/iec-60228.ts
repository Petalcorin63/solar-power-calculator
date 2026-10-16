/**
 * Maximum DC resistance of class 2 (stranded) copper conductors at 20 °C, Ω/km, from
 * IEC 60228. Used for every metric table (IEC and AS/NZS). Corrected to 75 °C and
 * doubled, these reproduce the single-phase voltage drops in AS/NZS 3008.1.2 Table 3.30
 * (e.g. 2.5 mm²: 2 × 7.41 × 1.216 = 18.0 mV/A·m).
 */
export const IEC_RESISTANCE_20C: Record<number, number> = {
  1.5: 12.1, 2.5: 7.41, 4: 4.61, 6: 3.08, 10: 1.83, 16: 1.15, 25: 0.727, 35: 0.524,
  50: 0.387, 70: 0.268, 95: 0.193, 120: 0.153, 150: 0.124, 185: 0.0991, 240: 0.0754, 300: 0.0601,
}
