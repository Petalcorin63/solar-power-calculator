/** Every supported location, keyed by id, in the order the selector lists them. */
import type { CodeId, ElectricalCode } from '../types'
import { ASNZS_CODE } from './asnzs'
import { IEC_CODE } from './iec'
import { NEC_CODE } from './nec'
import { PEC_CODE } from './pec'

export const ELECTRICAL_CODES: Record<CodeId, ElectricalCode> = {
  nec: NEC_CODE,
  pec: PEC_CODE,
  iec: IEC_CODE,
  asnzs: ASNZS_CODE,
}

export const CODE_IDS = Object.keys(ELECTRICAL_CODES) as CodeId[]
