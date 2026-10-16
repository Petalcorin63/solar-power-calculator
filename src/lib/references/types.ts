/** A cited source, as listed in the "Formulas & references" panel. */
export interface Reference {
  id: string
  /** Author(s) or issuing organization. */
  author: string
  title: string
  publisher: string
  /** Edition, report number or document type, if any. */
  detail?: string
  /** When the source was published or last revised, as precisely as the source states it. */
  updated: string
  url: string
  /** ISO date this source was last checked against the app. */
  accessed: string
  /** What the app takes from it. */
  supports: string
}
