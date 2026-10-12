/**
 * Sources behind the formulas and default assumptions, shown in the "Formulas &
 * references" panel. When re-checking them, update `accessed` (and `REFERENCES_REVIEWED`)
 * and fix any `updated` date or URL that has changed.
 */
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

export const REFERENCES_REVIEWED = '2026-10-04'

export const REFERENCES: Reference[] = [
  {
    id: 'pvwatts',
    author: 'National Laboratory of the Rockies (formerly NREL)',
    title: 'PVWatts Calculator',
    publisher: 'U.S. Department of Energy',
    detail: 'Web application',
    updated: 'Continuously maintained',
    url: 'https://pvwatts.nlr.gov/',
    accessed: '2026-10-04',
    supports: 'Peak sun hours (solar resource) for your location; cross-checking annual production.',
  },
  {
    id: 'pvwatts-manual',
    author: 'A. P. Dobos',
    title: 'PVWatts Version 5 Manual',
    publisher: 'National Renewable Energy Laboratory',
    detail: 'Technical Report NREL/TP-6A20-62641',
    updated: 'September 2014',
    url: 'https://docs.nlr.gov/docs/fy14osti/62641.pdf',
    accessed: '2026-10-04',
    supports: 'Default system losses of 14% and inverter efficiency of 96% (≈ 0.83 combined), the basis for the derate factor.',
  },
  {
    id: 'eia-ilr',
    author: 'C. Marcy',
    title: 'Solar plants typically install more panel capacity relative to their inverter capacity',
    publisher: 'U.S. Energy Information Administration, Today in Energy',
    updated: '16 March 2018',
    url: 'https://www.eia.gov/todayinenergy/detail.php?id=35372',
    accessed: '2026-10-04',
    supports: 'Inverter loading (DC:AC) ratios usually between 1.13 and 1.30.',
  },
  {
    id: 'victron-lfp',
    author: 'Victron Energy',
    title: '12,8 & 25,6 Volt Lithium-Iron-Phosphate Batteries Smart',
    publisher: 'Victron Energy B.V.',
    detail: 'Product datasheet',
    updated: '26 August 2024',
    url: 'https://www.victronenergy.com/upload/documents/Datasheet-12,8-&-25,6-Volt-lithium-iron-phosphate-batteries-Smart-EN.pdf',
    accessed: '2026-10-04',
    supports: 'LiFePO4 cycle life of 2,500 cycles at 80% DoD (5,000 at 50%); 92% round-trip efficiency.',
  },
  {
    id: 'victron-agm',
    author: 'Victron Energy',
    title: 'Gel and AGM Batteries',
    publisher: 'Victron Energy B.V.',
    detail: 'Product datasheet',
    updated: '9 December 2025',
    url: 'https://www.victronenergy.com/upload/documents/Datasheet-GEL-and-AGM-Batteries-EN.pdf',
    accessed: '2026-10-04',
    supports: 'AGM deep-cycle life of 1,500 cycles at 30%, 600 at 50% and 400 at 80% depth of discharge.',
  },
  {
    id: 'nec-690',
    author: 'National Fire Protection Association',
    title: 'NFPA 70, National Electrical Code, Article 690 (Solar Photovoltaic Systems), §690.8',
    publisher: 'NFPA',
    detail: '2026 edition',
    updated: '2026 edition',
    url: 'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70',
    accessed: '2026-10-04',
    supports: 'The 125% factor applied to PV circuit currents, mirrored by the 1.25× charge-controller margin.',
  },
  {
    id: 'doe-homeowner',
    author: 'U.S. Department of Energy',
    title: "Homeowner's Guide to Solar",
    publisher: 'U.S. Department of Energy',
    updated: 'No date given on page',
    url: 'https://www.energy.gov/cmei/systems/homeowners-guide-solar',
    accessed: '2026-10-04',
    supports: 'How net metering works and that it depends on your state and utility; using a certified installer.',
  },
]

/** 1-based citation number for a reference, in the order of the list above. */
export function citationNumber(id: string): number {
  const index = REFERENCES.findIndex(r => r.id === id)
  if (index === -1) throw new Error(`Unknown reference: ${id}`)
  return index + 1
}

/** Formats an ISO date (YYYY-MM-DD) as e.g. "4 October 2026", independent of the viewer's locale. */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${day} ${months[month - 1]} ${year}`
}
