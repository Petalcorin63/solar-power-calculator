/** The tabs, in the order a first-time user works through them. */
import type { Tab, TabId } from './types'

export const TABS: Tab[] = [
  { id: 'setup', label: 'Setup', icon: 'home' },
  { id: 'results', label: 'Results', icon: 'chart' },
  { id: 'diagram', label: 'Diagram & wiring', icon: 'diagram' },
  { id: 'references', label: 'Formulas & references', icon: 'book' },
  { id: 'projects', label: 'My projects', icon: 'folder', signedInOnly: true },
]

export const DEFAULT_TAB: TabId = 'setup'

/**
 * Tabs live in the URL as `#/results`. The `#/` prefix keeps them apart from in-page
 * anchors such as citation links (`#ref-pvwatts`), which must not switch tabs.
 */
export const TAB_HASH_PREFIX = '#/'
