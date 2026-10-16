<template>
  <div>
    <SectionCard
      title="System diagram"
      description="Click any part — panels, battery, inverter, a wire or a breaker — to see the calculation behind its size. Wires also need your cable lengths and panel datasheet values, and ask for them first."
      tone="violet"
      icon="diagram"
    >
      <SystemDiagram />
    </SectionCard>

    <DisclaimerNote class="mt-8" />

    <NextStep label="See the formulas and sources" @click="emit('open', 'references')" />
  </div>
</template>

<script setup lang="ts">
/** Diagram tab: the interactive diagram, where wires and breakers are sized. */
import { DisclaimerNote, SectionCard } from '../components/ui'
import { NextStep } from '../components/layout'
import { SystemDiagram } from '../components/diagram'
import type { TabId } from '../composables/navigation'

const emit = defineEmits<{ open: [id: TabId] }>()
</script>
