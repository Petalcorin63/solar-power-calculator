<template>
  <SectionCard
    title="Yearly use & solar target"
    description="How much electricity you use, and how much of it the solar panels should cover."
    tone="indigo"
    icon="grid"
  >
    <div class="grid sm:grid-cols-2 gap-5">
      <PartField
        field="annualUsageKwh"
        :hint="`From your utility bill — the household loads above add up to ≈ ${fmt(suggestedAnnualKwh)} kWh/yr`"
      />
      <PartField
        field="offsetPercent"
        :hint="allInOneHybrid
          ? 'Of the critical loads’ use — an all-in-one can’t export, so solar can only cover the loads on its output'
          : undefined"
      />
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
/** Setup tab (grid-tied and hybrid): yearly use from the bill, and how much of it solar should cover. */
import { computed } from 'vue'
import { SectionCard } from '../ui'
import { PartField } from '../inputs'
import { useCalculator } from '../../composables/calculator'
import { fmt } from '../../lib/diagram'
import { DAYS_PER_YEAR, WH_PER_KWH, dailyLoadWh } from '../../lib/sizing'

const { inputs } = useCalculator()

const suggestedAnnualKwh = computed(() => (dailyLoadWh(inputs.appliances) * DAYS_PER_YEAR) / WH_PER_KWH)
const allInOneHybrid = computed(() => inputs.systemType === 'hybrid' && inputs.hybridSetup === 'all-in-one')
</script>
