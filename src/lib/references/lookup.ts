/** Finding a listed source by id: its URL and its citation number. */
import { REFERENCES } from './data/sources'

/** URL of a listed reference, for linking to it from the page. */
export function referenceUrl(id: string): string {
  const reference = REFERENCES.find(r => r.id === id)
  if (!reference) throw new Error(`Unknown reference: ${id}`)
  return reference.url
}

/** 1-based citation number for a reference, in the order of the list. */
export function citationNumber(id: string): number {
  const index = REFERENCES.findIndex(r => r.id === id)
  if (index === -1) throw new Error(`Unknown reference: ${id}`)
  return index + 1
}
