/**
 * The calculator state saved by projects and auto-save. The server stores it as opaque
 * JSON — the frontend validates it field by field when loading (src/lib/project) — so
 * the only checks here are "is an object" (the route schema) and a size cap.
 */
import { HttpError } from '../http/index.js'
import { MAX_DATA_BYTES } from './constants.js'
import { PROJECT_ERRORS } from './data/messages.js'

/** JSON-encodes saved data, rejecting anything over the size cap with 413. */
export function serializeData(data: unknown): string {
  const json = JSON.stringify(data)
  if (Buffer.byteLength(json) > MAX_DATA_BYTES) throw new HttpError(413, PROJECT_ERRORS.tooLarge)
  return json
}
