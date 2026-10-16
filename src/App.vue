<template>
  <div class="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50/60 dark:from-gray-950 dark:via-gray-950 dark:to-slate-950 text-gray-900 dark:text-gray-100">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-16">
      <AccountMenu :workspace="workspace" class="mb-6" />
      <AppHeader class="mb-6" />
      <TabBar :tabs="visibleTabs" :active="active" :badges="badges" class="mb-8" @open="open" />

      <!-- Kept alive so a tab keeps its own state (e.g. the selected diagram part) while you look elsewhere. -->
      <KeepAlive>
        <SetupPage v-if="active === 'setup'" @open="open" />
        <ResultsPage v-else-if="active === 'results'" @open="open" />
        <DiagramPage v-else-if="active === 'diagram'" @open="open" />
        <ReferencesPage v-else-if="active === 'references'" />
        <ProjectsPage v-else-if="active === 'projects' && workspace.user.value" :workspace="workspace" />
      </KeepAlive>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The page frame: account menu, header, tabs. Creates the shared calculator state
 * (composables/calculator) and the signed-in workspace; each tab is a page in src/pages/.
 */
import { computed, onMounted, watch } from 'vue'
import { AccountMenu } from './components/account'
import { AppHeader, TabBar } from './components/layout'
import { createCalculator, provideCalculator } from './composables/calculator'
import { DEFAULT_TAB, TABS, useTabs, type TabId } from './composables/navigation'
import { useWorkspace } from './composables/workspace'
import DiagramPage from './pages/DiagramPage.vue'
import ProjectsPage from './pages/ProjectsPage.vue'
import ReferencesPage from './pages/ReferencesPage.vue'
import ResultsPage from './pages/ResultsPage.vue'
import SetupPage from './pages/SetupPage.vue'

const calculator = createCalculator()
provideCalculator(calculator)

const workspace = useWorkspace(calculator.snapshot, calculator.restore)
const { active, open } = useTabs()

/**
 * "My projects" exists only when signed in; don't leave the page on a tab that's gone —
 * after signing out, or on a #/projects link while signed out. Checked only once the
 * session is known, so a signed-in visitor's #/projects link isn't bounced while it loads.
 */
let sessionKnown = false
function leaveProjectsIfSignedOut(): void {
  if (sessionKnown && !workspace.user.value && active.value === 'projects') open(DEFAULT_TAB)
}

onMounted(async () => {
  await workspace.init()
  sessionKnown = true
  leaveProjectsIfSignedOut()
})
watch([active, () => workspace.user.value], leaveProjectsIfSignedOut)

const visibleTabs = computed(() => TABS.filter(tab => !tab.signedInOnly || workspace.user.value))
const badges = computed<Partial<Record<TabId, number>>>(() => ({ diagram: calculator.needsInfoCount.value }))
</script>
