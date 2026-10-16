<template>
  <!-- Below ~600px the labels get too small to read, so the drawing scrolls sideways in its own box instead. -->
  <div class="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-gray-950">
    <svg
      :viewBox="`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`"
      class="w-full min-w-[600px] h-auto select-none"
      role="group"
      :aria-label="`${SYSTEM_TYPE_LABELS[diagram.systemType]} system diagram`"
    >
      <!-- Faint dot grid, so the drawing reads as a schematic. -->
      <defs>
        <pattern id="diagram-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" class="fill-slate-200 dark:fill-slate-800" />
        </pattern>
      </defs>
      <rect :width="DRAWING_WIDTH" :height="DRAWING_HEIGHT" fill="url(#diagram-dots)" />

      <!-- Main breaker box to utility grid: the utility's side, shown for context and not sized. -->
      <path
        v-if="positions.extraLink"
        :d="positions.extraLink"
        class="fill-none stroke-indigo-300 dark:stroke-indigo-700"
        stroke-width="3"
        stroke-dasharray="6 5"
      />

      <!-- Wires -->
      <g
        v-for="wire in wires"
        :key="`wire-${wire.circuit.id}`"
        class="cursor-pointer outline-none group"
        role="button"
        tabindex="0"
        :aria-label="`Wire, ${wire.circuit.label}: ${part(wire.wireId).headline}`"
        :aria-pressed="selected === wire.wireId"
        @click="emit('select', wire.wireId)"
        @keydown.enter.prevent="emit('select', wire.wireId)"
        @keydown.space.prevent="emit('select', wire.wireId)"
      >
        <!-- Wide invisible stroke: a bigger click target than the visible wire. -->
        <path :d="wire.at.d" class="fill-none stroke-transparent" stroke-width="20" />
        <path
          :d="wire.at.d"
          class="fill-none transition-colors"
          :class="selected === wire.wireId
            ? 'stroke-fuchsia-500'
            : wire.circuit.dc
              ? 'stroke-slate-600 dark:stroke-slate-400 group-hover:stroke-fuchsia-400 group-focus-visible:stroke-fuchsia-500'
              : 'stroke-sky-500 dark:stroke-sky-400 group-hover:stroke-fuchsia-400 group-focus-visible:stroke-fuchsia-500'"
          :stroke-width="selected === wire.wireId ? 6 : 4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <text
          :x="wire.at.label[0]"
          :y="wire.at.label[1]"
          :text-anchor="wire.at.anchor"
          class="text-[13px] font-mono font-semibold"
          :class="isReady(part(wire.wireId))
            ? (wire.circuit.dc ? 'fill-slate-700 dark:fill-slate-200' : 'fill-sky-700 dark:fill-sky-300')
            : 'fill-gray-400'"
        >{{ isReady(part(wire.wireId)) ? part(wire.wireId).headline : 'size ?' }}</text>
        <circle
          v-if="!isReady(part(wire.wireId))"
          :cx="wireDotX(wire.at)"
          :cy="wire.at.label[1] - 4.5"
          r="4.5"
          class="fill-red-500 stroke-white dark:stroke-gray-950"
          stroke-width="1.5"
        />
      </g>

      <!-- Breakers, drawn on top of their wire -->
      <g
        v-for="wire in wires"
        :key="`breaker-${wire.circuit.id}`"
        class="cursor-pointer outline-none group"
        role="button"
        tabindex="0"
        :aria-label="`Breaker, ${wire.circuit.label}: ${part(wire.breakerId).headline}`"
        :aria-pressed="selected === wire.breakerId"
        @click="emit('select', wire.breakerId)"
        @keydown.enter.prevent="emit('select', wire.breakerId)"
        @keydown.space.prevent="emit('select', wire.breakerId)"
      >
        <rect
          :x="wire.at.breaker[0] - 28"
          :y="wire.at.breaker[1] - 12"
          width="56"
          height="24"
          rx="6"
          class="transition-colors"
          :class="selected === wire.breakerId
            ? 'fill-fuchsia-500 stroke-fuchsia-600'
            : 'fill-white dark:fill-gray-900 stroke-slate-400 dark:stroke-slate-500 group-hover:stroke-fuchsia-400 group-focus-visible:stroke-fuchsia-500'"
          stroke-width="2"
        />
        <text
          :x="wire.at.breaker[0]"
          :y="wire.at.breaker[1] + 4.5"
          text-anchor="middle"
          class="text-[12px] font-mono font-bold"
          :class="selected === wire.breakerId ? 'fill-white' : 'fill-gray-700 dark:fill-gray-200'"
        >{{ isReady(part(wire.breakerId)) ? part(wire.breakerId).headline : '? A' }}</text>
        <circle
          v-if="!isReady(part(wire.breakerId))"
          :cx="wire.at.breaker[0] - 27"
          :cy="wire.at.breaker[1] - 11"
          r="5"
          class="fill-red-500 stroke-white dark:stroke-gray-950"
          stroke-width="2"
        />
      </g>

      <!-- Equipment, each in its own color -->
      <g
        v-for="box in boxes"
        :key="box.node"
        class="cursor-pointer outline-none group"
        role="button"
        tabindex="0"
        :aria-label="`${part(box.node).title}: ${part(box.node).headline}`"
        :aria-pressed="selected === box.node"
        @click="emit('select', box.node)"
        @keydown.enter.prevent="emit('select', box.node)"
        @keydown.space.prevent="emit('select', box.node)"
      >
        <rect
          :x="box.x"
          :y="box.y"
          :width="NODE_WIDTH"
          :height="NODE_HEIGHT"
          rx="14"
          class="transition-colors"
          :class="[
            selected === box.node ? nodeTone(box.node).svgFillSelected : nodeTone(box.node).svgFill,
            selected === box.node ? 'stroke-fuchsia-500' : [nodeTone(box.node).svgStroke, 'group-hover:stroke-fuchsia-400 group-focus-visible:stroke-fuchsia-500'],
          ]"
          :stroke-width="selected === box.node ? 3 : 2"
        />
        <!-- Icon badge on the box's corner -->
        <circle
          :cx="box.x + 16"
          :cy="box.y"
          r="14"
          :class="nodeTone(box.node).svgSolid"
          class="stroke-white dark:stroke-gray-950"
          stroke-width="3"
        />
        <AppIcon
          :name="NODE_ICONS[box.node]"
          :x="box.x + 8"
          :y="box.y - 8"
          width="16"
          height="16"
          class="text-white"
        />
        <text
          :x="box.x + NODE_WIDTH / 2"
          :y="box.y + 33"
          text-anchor="middle"
          class="text-[14px] font-semibold fill-gray-900 dark:fill-white"
        >{{ labels[box.node] }}</text>
        <text
          :x="box.x + NODE_WIDTH / 2"
          :y="box.y + 54"
          text-anchor="middle"
          class="text-[12.5px] font-mono"
          :class="isReady(part(box.node)) ? 'fill-gray-600 dark:fill-gray-300' : 'fill-red-500'"
        >{{ part(box.node).headline }}</text>
        <circle
          v-if="!isReady(part(box.node))"
          :cx="box.x + NODE_WIDTH - 2"
          :cy="box.y + 2"
          r="7"
          class="fill-red-500 stroke-white dark:stroke-gray-950"
          stroke-width="2.5"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
/** The SVG drawing: equipment boxes, wires and breakers, each clickable. Emits the clicked part's id. */
import { computed } from 'vue'
import { AppIcon } from '../ui'
import { NODE_ICONS } from '../theme'
import { DRAWING_HEIGHT, DRAWING_WIDTH, NODE_HEIGHT, NODE_WIDTH } from './constants'
import { POSITIONS } from './data/positions'
import { nodeLabels, nodeTone, wireDotX } from './labels'
import { isReady, type PartDetail, type PartId, type SystemDiagram } from '../../lib/diagram'
import { SYSTEM_TYPE_LABELS } from '../../lib/sizing'

const props = defineProps<{
  diagram: SystemDiagram
  selected: PartId
}>()

const emit = defineEmits<{ select: [id: PartId] }>()

const positions = computed(() => POSITIONS[props.diagram.layout])
const labels = computed(() => nodeLabels(props.diagram))

/** Each circuit with its on-screen position; a circuit without one is a bug in data/positions.ts. */
const wires = computed(() => props.diagram.circuits.map(circuit => {
  const at = positions.value.wires[circuit.id]
  if (!at) throw new Error(`No position for the ${circuit.id} wire on the ${props.diagram.layout} drawing`)
  return { circuit, at, wireId: `wire:${circuit.id}` as const, breakerId: `breaker:${circuit.id}` as const }
}))

const boxes = computed(() => props.diagram.nodes.map(node => {
  const at = positions.value.nodes[node]
  if (!at) throw new Error(`No position for the ${node} box on the ${props.diagram.layout} drawing`)
  return { node, x: at[0], y: at[1] }
}))

/** A part on the current drawing. Only called for ids taken from the drawing itself. */
function part(id: PartId): PartDetail {
  const found = props.diagram.parts[id]
  if (!found) throw new Error(`No ${id} on the ${props.diagram.layout} diagram`)
  return found
}
</script>
