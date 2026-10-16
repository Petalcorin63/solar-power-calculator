/**
 * United States — NEC 2026. Table 310.16 (75 °C copper), Chapter 9 Table 8 (stranded,
 * uncoated, 75 °C), 240.4(D) small-conductor limits, 240.6(A) standard ratings.
 */
import { ohmsPerKmFromKft as kft } from '../conductor-tables'
import type { Conductor, ElectricalCode } from '../types'

const NEC_CONDUCTORS: Conductor[] = [
  { size: '14 AWG', mm2: 2.08, ampacity: 20, maxOcpd: 15, ohmsPerKm: kft(3.14) },
  { size: '12 AWG', mm2: 3.31, ampacity: 25, maxOcpd: 20, ohmsPerKm: kft(1.98) },
  { size: '10 AWG', mm2: 5.26, ampacity: 35, maxOcpd: 30, ohmsPerKm: kft(1.24) },
  { size: '8 AWG', mm2: 8.37, ampacity: 50, maxOcpd: 50, ohmsPerKm: kft(0.778) },
  { size: '6 AWG', mm2: 13.3, ampacity: 65, maxOcpd: 65, ohmsPerKm: kft(0.491) },
  { size: '4 AWG', mm2: 21.2, ampacity: 85, maxOcpd: 85, ohmsPerKm: kft(0.308) },
  { size: '3 AWG', mm2: 26.7, ampacity: 100, maxOcpd: 100, ohmsPerKm: kft(0.245) },
  { size: '2 AWG', mm2: 33.6, ampacity: 115, maxOcpd: 115, ohmsPerKm: kft(0.194) },
  { size: '1 AWG', mm2: 42.4, ampacity: 130, maxOcpd: 130, ohmsPerKm: kft(0.154) },
  { size: '1/0 AWG', mm2: 53.5, ampacity: 150, maxOcpd: 150, ohmsPerKm: kft(0.122) },
  { size: '2/0 AWG', mm2: 67.4, ampacity: 175, maxOcpd: 175, ohmsPerKm: kft(0.0967) },
  { size: '3/0 AWG', mm2: 85.0, ampacity: 200, maxOcpd: 200, ohmsPerKm: kft(0.0766) },
  { size: '4/0 AWG', mm2: 107, ampacity: 230, maxOcpd: 230, ohmsPerKm: kft(0.0608) },
  { size: '250 kcmil', mm2: 127, ampacity: 255, maxOcpd: 255, ohmsPerKm: kft(0.0515) },
  { size: '300 kcmil', mm2: 152, ampacity: 285, maxOcpd: 285, ohmsPerKm: kft(0.0429) },
  { size: '350 kcmil', mm2: 177, ampacity: 310, maxOcpd: 310, ohmsPerKm: kft(0.0367) },
  { size: '400 kcmil', mm2: 203, ampacity: 335, maxOcpd: 335, ohmsPerKm: kft(0.0321) },
  { size: '500 kcmil', mm2: 253, ampacity: 380, maxOcpd: 380, ohmsPerKm: kft(0.0258) },
]

/** NEC 240.6(A) standard ratings up to 600 A; the Philippine code uses the same series. */
export const NEC_BREAKERS = [
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200,
  225, 250, 300, 350, 400, 450, 500, 600,
]

export const NEC_CODE: ElectricalCode = {
  id: 'nec',
  label: 'United States — NEC 2026',
  standard: 'NEC 2026',
  conductors: NEC_CONDUCTORS,
  breakers: NEC_BREAKERS,
  pvCurrentFactor: 1.25,
  pvDesignFactor: 1.25,
  continuousFactor: 1.25,
  acVoltages: [120, 240],
  defaultAcVoltage: 240,
  rules: { pvCurrent: 'NEC 690.8(A)', breaker: 'NEC 240.6(A)', conductor: 'NEC 310.16, 240.4' },
  ampacityBasis: '75 °C copper, up to three current-carrying conductors together, 30 °C ambient',
  notes: [],
  references: ['nec-690', 'nec-wiring'],
}
