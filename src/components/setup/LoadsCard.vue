<template>
  <SectionCard
    title="Household loads"
    :description="inputs.systemType === 'off-grid'
      ? 'Everything the system needs to power, day to day.'
      : 'Used to estimate your yearly electricity use below — use your utility bill instead if you have it.'"
    tone="sky"
    icon="home"
  >
    <ApplianceTable v-model="inputs.appliances" />
  </SectionCard>
</template>

<script setup lang="ts">
/** Setup tab: the household's appliances (the whole load on off-grid; an estimate of use otherwise). */
import { SectionCard } from '../ui'
import { ApplianceTable } from '../inputs'
import { useCalculator } from '../../composables/calculator'

const { inputs } = useCalculator()
</script>
