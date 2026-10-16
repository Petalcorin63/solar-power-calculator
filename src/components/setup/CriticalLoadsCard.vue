<template>
  <SectionCard
    title="Critical loads (kept on in an outage)"
    :description="inputs.hybridSetup === 'all-in-one'
      ? 'Everything wired to the all-in-one inverter’s output. These run on solar and battery first and stay on in an outage — and they set the panel size, since solar can’t reach anything else.'
      : 'Only what the battery must keep running when the grid goes down — fridge, a few lights, wifi — not the whole house.'"
    tone="rose"
    icon="critical"
  >
    <ApplianceTable v-model="inputs.criticalAppliances" />
  </SectionCard>
</template>

<script setup lang="ts">
/** Setup tab (hybrid): the appliances the battery backs up. */
import { SectionCard } from '../ui'
import { ApplianceTable } from '../inputs'
import { useCalculator } from '../../composables/calculator'

const { inputs } = useCalculator()
</script>
