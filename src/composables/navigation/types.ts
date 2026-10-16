/** The page's tabs. */
import type { IconName } from '../../components/theme'

export type TabId = 'setup' | 'results' | 'diagram' | 'references' | 'projects'

export interface Tab {
  id: TabId
  label: string
  icon: IconName
  /** Shown only to signed-in users. */
  signedInOnly?: boolean
}
