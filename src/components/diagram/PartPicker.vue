<template>
  <!-- The same parts as the drawing, as buttons — easier to hit on a phone than the scaled-down drawing. -->
  <div class="space-y-2.5">
    <div v-for="group in groups" :key="group.label" class="flex flex-wrap items-center gap-1.5">
      <span class="w-full sm:w-24 text-xs font-semibold uppercase tracking-widest text-gray-400">{{ group.label }}</span>
      <button
        v-for="id in group.ids"
        :key="id"
        type="button"
        class="relative inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold border transition-colors"
        :class="selected === id
          ? partTone(diagram, id).solid
          : ['border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300', partTone(diagram, id).hover]"
        :aria-pressed="selected === id"
        @click="emit('select', id)"
      >
        <span
          class="inline-flex items-center justify-center w-5 h-5 rounded-full"
          :class="selected === id ? 'bg-white/20' : partTone(diagram, id).badge"
        >
          <AppIcon :name="partIcon(id)" class="w-3.5 h-3.5" />
        </span>
        {{ partLabel(diagram, id, false) }}
        <span
          v-if="!readyIds.has(id)"
          class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"
        >
          <span class="sr-only">(needs info)</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Every part on the drawing as a row of buttons: equipment, wires, breakers. */
import { computed } from 'vue'
import { AppIcon } from '../ui'
import { partIcon, partLabel, partTone } from './labels'
import type { PartGroup } from './types'
import { isReady, type PartId, type SystemDiagram } from '../../lib/diagram'

const props = defineProps<{
  diagram: SystemDiagram
  selected: PartId
}>()

const emit = defineEmits<{ select: [id: PartId] }>()

const groups = computed<PartGroup[]>(() => [
  { label: 'Equipment', ids: props.diagram.nodes },
  { label: 'Wires', ids: props.diagram.circuits.map(c => `wire:${c.id}` as const) },
  { label: 'Breakers', ids: props.diagram.circuits.map(c => `breaker:${c.id}` as const) },
])

const readyIds = computed(() => new Set(
  Object.values(props.diagram.parts).filter(isReady).map(part => part.id),
))
</script>
