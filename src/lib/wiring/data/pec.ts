/**
 * Philippines — PEC 2017. Table 3.10.2.6(B)(16), 75 °C copper, from a secondary source
 * (the official text isn't freely available). 2.0–38 mm² match the NEC values for the
 * equivalent AWG sizes. Resistance is derived from the area: 21.4 Ω·mm²/km reproduces
 * NEC Chapter 9 Table 8 at 75 °C to within 1% (10 AWG: 21.4 ÷ 5.26 = 4.07 Ω/km = 1.24 Ω/kft).
 */
import type { Conductor, ElectricalCode } from '../types'
import { NEC_BREAKERS } from './nec'

/** Copper resistivity at 75 °C, stranded, Ω·mm²/km — see the comment above. */
const OHM_MM2_PER_KM_AT_75C = 21.4

/** A PEC conductor; sizes under 10 mm² are written with one decimal, as the code names them. */
function pec(mm2: number, ampacity: number, maxOcpd = ampacity): Conductor {
  return { size: `${mm2 < 10 ? mm2.toFixed(1) : String(mm2)} mm²`, mm2, ampacity, maxOcpd, ohmsPerKm: OHM_MM2_PER_KM_AT_75C / mm2 }
}

const PEC_CONDUCTORS: Conductor[] = [
  pec(2.0, 20, 15), pec(3.5, 25, 20), pec(5.5, 35, 30), pec(8.0, 50), pec(14, 65),
  pec(22, 85), pec(30, 100), pec(38, 115), pec(50, 140), pec(60, 155), pec(80, 190),
  pec(100, 220), pec(125, 255), pec(150, 285), pec(175, 305), pec(200, 325),
  pec(250, 375), pec(325, 435), pec(375, 470), pec(400, 480), pec(500, 530),
]

export const PEC_CODE: ElectricalCode = {
  id: 'pec',
  label: 'Philippines — PEC 2017',
  standard: 'PEC 2017',
  conductors: PEC_CONDUCTORS,
  breakers: NEC_BREAKERS,
  pvCurrentFactor: 1.25,
  pvDesignFactor: 1.25,
  continuousFactor: 1.25,
  acVoltages: [230],
  defaultAcVoltage: 230,
  rules: { pvCurrent: 'PEC 2017, following NEC 690.8', breaker: 'standard ratings, as NEC 240.6(A)', conductor: 'PEC Table 3.10.2.6(B)(16)' },
  ampacityBasis: '75 °C copper (THW/THHN), up to three current-carrying conductors together, 30 °C ambient',
  notes: ['PEC values come from a secondary source, as the code isn\'t freely available — check them against your copy of PEC 2017 Part 1.'],
  references: ['pec-tables'],
}
