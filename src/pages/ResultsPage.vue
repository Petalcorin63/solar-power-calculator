<template>
  <section aria-labelledby="results-heading">
    <h2 id="results-heading" class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
      Your results — {{ SYSTEM_TYPE_LABELS[inputs.systemType] }}
    </h2>
    <OffGridResults v-if="inputs.systemType === 'off-grid'" />
    <GridTiedResults v-else-if="inputs.systemType === 'grid-tied'" />
    <HybridResults v-else />

    <!-- Right next to the numbers, so it can't be missed. -->
    <DisclaimerNote class="mt-8" />

    <NextStep label="Size the wires and breakers" @click="emit('open', 'diagram')" />
  </section>
</template>

<script setup lang="ts">
/** Results tab: the equipment sizes for the selected system type. */
import { DisclaimerNote } from '../components/ui'
import { NextStep } from '../components/layout'
import { GridTiedResults, HybridResults, OffGridResults } from '../components/results'
import { useCalculator } from '../composables/calculator'
import type { TabId } from '../composables/navigation'
import { SYSTEM_TYPE_LABELS } from '../lib/sizing'

const emit = defineEmits<{ open: [id: TabId] }>()
const { inputs } = useCalculator()
</script>
