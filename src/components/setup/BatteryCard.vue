<template>
  <SectionCard
    :title="hybrid ? 'Backup battery & inverter' : 'Battery & inverter'"
    :description="hybrid
      ? 'Sized to carry the critical loads through an outage.'
      : 'Sized to carry the whole load through days without sun.'"
    tone="emerald"
    icon="battery"
  >
    <!-- Hybrid: an exporting hybrid inverter, or an all-in-one inverter-charger fed from the grid. -->
    <div v-if="hybrid" :class="setupBlock">
      <PartField field="hybridSetup" />
      <PartField v-if="inputs.hybridSetup === 'all-in-one'" field="acChargeAmps" />
      <PartField v-else field="batteryChargeAmps" />
      <p :class="setupNote">
        {{ inputs.hybridSetup === 'all-in-one'
          ? 'An all-in-one inverter (PowMr, MPP Solar and similar) takes grid power on its AC input and runs the critical loads from solar and battery first. It can’t send power back to the grid, so the panels are sized to the critical loads.'
          : 'A grid-interactive hybrid inverter can export surplus solar to the grid (where your utility allows), so the panels can be sized to your whole yearly use.' }}
      </p>
    </div>
    <!-- Off-grid gear comes either as separate boxes or as one all-in-one inverter-charger. -->
    <div v-else :class="setupBlock">
      <PartField field="offGridSetup" />
      <PartField v-if="inputs.offGridSetup === 'all-in-one'" field="acInputSource" />
      <PartField v-if="inputs.offGridSetup === 'all-in-one' && inputs.acInputSource === 'grid-generator'" field="acChargeAmps" />
      <p :class="setupNote">
        {{ inputs.offGridSetup === 'all-in-one'
          ? 'An all-in-one inverter (PowMr, MPP Solar and similar) has the solar charge controller and a battery charger built in. Many can also take grid or generator power to charge the battery.'
          : 'A separate MPPT charge controller charges the battery from the panels, and a separate inverter runs the loads.' }}
      </p>
    </div>

    <div class="grid sm:grid-cols-2 gap-5">
      <PartField field="systemVoltage" />
      <PartField v-if="hybrid" field="backupDays" />
      <PartField v-else field="daysOfAutonomy" />
      <PartField field="batteryChemistry" />
      <PartField field="batteryAh" />
      <PartField field="batteryVoltage" />
      <PartField field="inverterMarginPercent" />
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
/** Setup tab (off-grid and hybrid): the equipment setup, battery bank and inverter headroom. */
import { computed } from 'vue'
import { SectionCard } from '../ui'
import { PartField } from '../inputs'
import { useCalculator } from '../../composables/calculator'

const { inputs } = useCalculator()

const hybrid = computed(() => inputs.systemType === 'hybrid')

const setupBlock = 'grid sm:grid-cols-2 gap-5 mb-5 pb-5 border-b border-emerald-100 dark:border-emerald-900/50'
const setupNote = 'sm:col-span-2 -mt-2 text-xs text-gray-500 dark:text-gray-400'
</script>
