<template>
  <!-- Sticky, so switching tabs is always one tap away; scrolls sideways on narrow phones. -->
  <nav
    class="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-2 py-2 sm:rounded-2xl bg-white/85 dark:bg-gray-950/85 backdrop-blur border-y sm:border border-gray-200/70 dark:border-gray-800 shadow-sm shadow-gray-200/40 dark:shadow-none"
    aria-label="Sections"
  >
    <ul class="flex gap-1 overflow-x-auto" role="tablist">
      <li v-for="tab in tabs" :key="tab.id" role="presentation">
        <button
          type="button"
          role="tab"
          :aria-selected="active === tab.id"
          class="relative inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
          :class="active === tab.id
            ? 'bg-amber-500 text-white shadow-sm shadow-amber-200/60 dark:shadow-none'
            : 'text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-800 hover:text-amber-700 dark:hover:text-amber-300'"
          @click="emit('open', tab.id)"
        >
          <AppIcon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
          <span
            v-if="badges[tab.id]"
            class="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold tabular-nums"
            :title="`${badges[tab.id]} part(s) still need info`"
          >{{ badges[tab.id] }}<span class="sr-only"> need info</span></span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
/** The row of tabs. Emits the tab to open; which one is active lives in useTabs(). */
import { AppIcon } from '../ui'
import type { Tab, TabId } from '../../composables/navigation'

defineProps<{
  tabs: Tab[]
  active: TabId
  /** Red counters, e.g. how many diagram parts still need info. */
  badges: Partial<Record<TabId, number>>
}>()

const emit = defineEmits<{ open: [id: TabId] }>()
</script>
