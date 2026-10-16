/**
 * Wire and breaker sizing, per location's electrical code. Copper conductors at each
 * code's reference installation conditions, with no derating — the references panel
 * cites every table. Regional tables live one file per region in `data/`.
 */
export type * from './types'
export * from './constants'
export { ELECTRICAL_CODES, CODE_IDS } from './data/codes'
export * from './protection'
export * from './circuits'
