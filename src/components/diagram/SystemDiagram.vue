<template>
  <div>
    <!-- Wire and breaker sizes follow the selected location's code tables. -->
    <div class="grid sm:grid-cols-2 gap-x-5 gap-y-2 items-end mb-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 p-4">
      <PartField field="electricalCode" />
      <p class="text-xs text-gray-500 dark:text-gray-400 sm:pb-1">
        Wires and breakers follow {{ diagram.code.standard }}. Cable ratings assume {{ diagram.code.ampacityBasis }}.
      </p>
    </div>

    <DiagramCanvas :diagram="diagram" :selected="selected" @select="select" />
    <p class="sm:hidden mt-1.5 text-xs text-gray-400 text-center">Swipe the drawing sideways to see all of it, or use the buttons below.</p>

    <p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span class="inline-flex items-center gap-1.5"><span class="inline-block w-5 h-1 rounded bg-slate-600 dark:bg-slate-400" /> DC wire</span>
      <span class="inline-flex items-center gap-1.5"><span class="inline-block w-5 h-1 rounded bg-sky-500 dark:bg-sky-400" /> AC wire</span>
      <span class="inline-flex items-center gap-1.5"><span class="inline-block w-5 h-3 rounded border-2 border-slate-400" /> breaker (amps)</span>
      <span class="inline-flex items-center gap-1.5"><span class="inline-block w-5 h-1 rounded bg-fuchsia-500" /> selected</span>
      <span class="inline-flex items-center gap-1.5"><span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> needs info from you</span>
    </p>
    <p
      v-if="needsInfoCount > 0"
      class="mt-2 inline-flex items-center gap-2 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300"
    >
      <span class="w-2 h-2 rounded-full bg-red-500" />
      {{ needsInfoCount }} part{{ needsInfoCount === 1 ? '' : 's' }} still need{{ needsInfoCount === 1 ? 's' : '' }} info — click a red dot to fill it in
    </p>

    <PartPicker class="mt-4" :diagram="diagram" :selected="selected" @select="select" />

    <div ref="panel" class="mt-6">
      <PartDetailPanel v-if="current" :diagram="diagram" :part-id="selected" :part="current" @select="select" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The interactive system diagram: the drawing, the same parts as buttons, and the
 * selected part's details. Owns which part is selected; the parts themselves come from
 * lib/diagram via the shared calculator.
 */
import { computed, ref, watch } from 'vue'
import { PartField } from '../inputs'
import { DEFAULT_PART } from './constants'
import DiagramCanvas from './DiagramCanvas.vue'
import PartDetailPanel from './PartDetailPanel.vue'
import PartPicker from './PartPicker.vue'
import { useCalculator } from '../../composables/calculator'
import type { PartId } from '../../lib/diagram'

const { diagram, needsInfoCount } = useCalculator()

const selected = ref<PartId>(DEFAULT_PART)
const current = computed(() => diagram.value.parts[selected.value])

// Switching system type can remove the selected part (e.g. the charge controller).
watch(diagram, d => {
  if (!d.parts[selected.value]) selected.value = DEFAULT_PART
})

const panel = ref<HTMLElement | null>(null)

function select(id: PartId): void {
  selected.value = id
  // On narrow screens the panel sits below the fold; bring it into view without jumping on desktop.
  requestAnimationFrame(() => {
    const el = panel.value
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.8) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}
</script>
