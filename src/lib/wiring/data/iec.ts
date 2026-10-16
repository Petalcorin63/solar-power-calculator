/**
 * Europe / IEC — IEC 60364. Cable ratings from IEC 60364-5-52 Table B.52.2: PVC, two
 * loaded copper conductors, reference method C (clipped direct), 30 °C ambient.
 */
import { metricConductors } from '../conductor-tables'
import type { ElectricalCode } from '../types'

/**
 * Common miniature circuit-breaker ratings to 125 A, then moulded-case steps to 630 A.
 * IEC 60898-1 clause 5.3.2 lists preferred values but isn't freely readable, so the
 * app tells users to check their supplier's range rather than citing it.
 */
export const IEC_BREAKERS = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630]

export const IEC_CODE: ElectricalCode = {
  id: 'iec',
  label: 'Europe / IEC — IEC 60364',
  standard: 'IEC 60364',
  conductors: metricConductors({
    1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213,
    95: 258, 120: 299, 150: 344, 185: 392, 240: 461, 300: 530,
  }),
  breakers: IEC_BREAKERS,
  pvCurrentFactor: 1.25,
  pvDesignFactor: 1,
  continuousFactor: 1,
  acVoltages: [230],
  defaultAcVoltage: 230,
  rules: { pvCurrent: 'IEC 60364-7-712', breaker: 'common MCB/MCCB ratings', conductor: 'IEC 60364-5-52 Table B.52.2' },
  ampacityBasis: 'PVC-insulated copper (70 °C), two loaded conductors clipped direct (method C), 30 °C ambient',
  notes: [
    'IEC sizing: design current ≤ breaker rating ≤ cable capacity (IEC 60364-4-43), with no extra 125% margin. National wiring rules based on IEC 60364, such as the UK\'s BS 7671, can add their own requirements.',
    'Breaker ratings follow the common miniature (6–125 A) and moulded-case (160–630 A) steps; check the range your supplier sells.',
  ],
  references: ['iec-tables', 'eig-protection', 'fronius-pv'],
}
