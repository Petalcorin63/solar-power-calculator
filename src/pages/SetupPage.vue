<template>
  <div>
    <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
      1. Pick your type of system
    </h2>
    <SystemTypeToggle v-model="inputs.systemType" :options="SYSTEM_TYPE_OPTIONS" class="mb-10" />

    <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
      2. Describe your home and equipment
    </h2>
    <div class="space-y-6">
      <LoadsCard />
      <SunlightCard />
      <YearlyUseCard v-if="inputs.systemType !== 'off-grid'" />
      <CriticalLoadsCard v-if="inputs.systemType === 'hybrid'" />
      <BatteryCard v-if="inputs.systemType !== 'grid-tied'" />
    </div>

    <NextStep label="See your results" @click="emit('open', 'results')" />
  </div>
</template>

<script setup lang="ts">
/** Setup tab: the system type, then every input card that applies to it. */
import { SYSTEM_TYPE_OPTIONS, SystemTypeToggle } from '../components/inputs'
import { NextStep } from '../components/layout'
import { BatteryCard, CriticalLoadsCard, LoadsCard, SunlightCard, YearlyUseCard } from '../components/setup'
import { useCalculator } from '../composables/calculator'
import type { TabId } from '../composables/navigation'

const emit = defineEmits<{ open: [id: TabId] }>()
const { inputs } = useCalculator()
</script>
