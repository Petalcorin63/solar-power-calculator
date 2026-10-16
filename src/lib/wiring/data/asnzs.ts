/**
 * Australia / New Zealand — AS/NZS 3000, 3008 and 5033. Cable ratings from AS/NZS
 * 3008.1.2:2017 Table 3.7: single-core copper PVC, single-phase, touching on a surface,
 * 30 °C (New Zealand conditions).
 */
import { metricConductors } from '../conductor-tables'
import type { ElectricalCode } from '../types'
import { IEC_BREAKERS } from './iec'

export const ASNZS_CODE: ElectricalCode = {
  id: 'asnzs',
  label: 'Australia / NZ — AS/NZS 3008',
  standard: 'AS/NZS 3000/3008/5033',
  conductors: metricConductors({
    1.5: 18, 2.5: 26, 4: 35, 6: 46, 10: 62, 16: 82, 25: 111, 35: 136, 50: 166, 70: 210,
    95: 262, 120: 304, 150: 351, 185: 408, 240: 488, 300: 564,
  }),
  breakers: IEC_BREAKERS,
  pvCurrentFactor: 1.25,
  pvDesignFactor: 1,
  continuousFactor: 1,
  acVoltages: [230],
  defaultAcVoltage: 230,
  rules: { pvCurrent: 'AS/NZS 5033 cl. 3.3.3.1', breaker: 'common MCB/MCCB ratings', conductor: 'AS/NZS 3008.1.2 Table 3.7' },
  ampacityBasis: 'PVC-insulated single-core copper, single-phase, touching on a surface, 30 °C ambient (New Zealand conditions)',
  notes: [
    'Ratings are for New Zealand conditions (30 °C). Australia\'s AS/NZS 3008.1.1 assumes 40 °C, which lowers ratings by roughly 10–15% — check the Australian table before relying on a size near its limit.',
    'AS/NZS 3000 limits voltage drop to 5% from the point of supply to any point in the installation.',
  ],
  references: ['nexans-asnzs', 'cec-5033', 'firstflex'],
}
