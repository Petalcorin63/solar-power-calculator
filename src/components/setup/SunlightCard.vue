<template>
  <SectionCard title="Sunlight & solar panels" description="How much sun your location gets, and the panels you plan to use." tone="amber" icon="sun">
    <div class="grid sm:grid-cols-2 gap-5">
      <PartField field="peakSunHours" />
      <PartField field="systemDeratePercent" />
      <PartField field="panelWatts" />
      <!-- Only inverters that export are sized from the panels by a DC:AC ratio. -->
      <PartField
        v-if="inputs.systemType === 'grid-tied' || (inputs.systemType === 'hybrid' && inputs.hybridSetup === 'grid-interactive')"
        field="dcAcRatio"
      />
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
/** Setup tab: sun hours, losses and panel size. */
import { SectionCard } from '../ui'
import { PartField } from '../inputs'
import { useCalculator } from '../../composables/calculator'

const { inputs } = useCalculator()
</script>
