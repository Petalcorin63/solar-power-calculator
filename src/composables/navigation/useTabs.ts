/**
 * The active tab, kept in the URL hash (`#/results`) so the browser's back button
 * moves between tabs and a link can open a specific tab.
 */
import { onBeforeUnmount, ref, type Ref } from 'vue'
import { DEFAULT_TAB, TABS, TAB_HASH_PREFIX } from './constants'
import type { TabId } from './types'

/** The tab a hash names, or null for any other hash (including in-page anchors). */
function tabFromHash(hash: string): TabId | null {
  if (!hash.startsWith(TAB_HASH_PREFIX)) return null
  const id = hash.slice(TAB_HASH_PREFIX.length)
  return TABS.find(tab => tab.id === id)?.id ?? null
}

export function useTabs(): { active: Readonly<Ref<TabId>>, open: (id: TabId) => void } {
  const active = ref<TabId>(tabFromHash(window.location.hash) ?? DEFAULT_TAB)

  function onHashChange(): void {
    const tab = tabFromHash(window.location.hash)
    // Other hashes are in-page anchors (citations): leave the tab as it is.
    if (tab) active.value = tab
  }
  window.addEventListener('hashchange', onHashChange)
  onBeforeUnmount(() => { window.removeEventListener('hashchange', onHashChange) })

  /** Switches tab (adding a history entry) and scrolls back up to the tab bar. */
  function open(id: TabId): void {
    if (id !== active.value) window.location.hash = `${TAB_HASH_PREFIX}${id}`
    active.value = id
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { active, open }
}
