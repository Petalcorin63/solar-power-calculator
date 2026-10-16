<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <ResultStat
      label="Solar panels needed"
      tone="amber"
      icon="panel"
      :value="fmt(r.arrayWattsNeeded)"
      unit="W"
      :hint="`${r.panelCount} × ${inputs.panelWatts} W panel(s) = ${fmt(r.installedArrayWatts)} W installed`"
    />
    <ResultStat
      label="Estimated yearly production"
      tone="indigo"
      icon="chart"
      :value="fmt(r.estimatedAnnualProductionKwh)"
      unit="kWh/yr"
      :hint="allInOne
        ? `About ${fmt(r.usableProductionKwh)} kWh/yr usable by the critical loads (no export) — ${fmt(percentOfUse(r.usableProductionKwh, inputs.annualUsageKwh))}% of your ${fmt(inputs.annualUsageKwh)} kWh/yr`
        : `${fmt(percentOfUse(r.estimatedAnnualProductionKwh, inputs.annualUsageKwh))}% of your ${fmt(inputs.annualUsageKwh)} kWh/yr (target ${inputs.offsetPercent}%)`"
    />
    <template v-if="allInOne">
      <ResultStat
        label="Built-in solar charger needed"
        tone="orange"
        icon="controller"
        :value="fmt(r.solarChargerAmps ?? 0)"
        unit="A minimum"
        hint="The all-in-one's max solar charging current should be at least this"
      />
      <ResultStat
        label="All-in-one inverter"
        tone="violet"
        icon="inverter"
        :value="fmt(r.backupInverterWatts)"
        unit="W continuous"
        hint="Runs the critical loads from solar, battery or the grid on its AC input"
      />
    </template>
    <template v-else>
      <ResultStat
        label="Hybrid inverter — solar side"
        tone="violet"
        icon="inverter"
        :value="fmt(r.gridTieInverterWatts)"
        unit="W AC"
        hint="Turns the panels' output into household power and charges the battery"
      />
      <ResultStat
        label="Hybrid inverter — backup side"
        tone="violet"
        icon="inverter"
        :value="fmt(r.backupInverterWatts)"
        unit="W continuous"
        hint="Runs the critical loads in an outage — pick an inverter that meets both ratings"
      />
    </template>
    <ResultStat
      label="Critical loads at peak"
      tone="rose"
      icon="critical"
      :value="fmt(r.criticalPeakW)"
      unit="W"
      hint="Every critical appliance running at the same time"
    />
    <ResultStat
      label="Backup battery needed"
      tone="emerald"
      icon="battery"
      :value="fmt(r.batteryBankAh)"
      unit="Ah"
      :hint="`${fmt(r.batteryBankWh)} Wh · ${batteryText(r.batteries, inputs.batteryAh, inputs.batteryVoltage)}`"
    />
  </div>
</template>

<script setup lang="ts">
/** Results tab, hybrid: panels, production, inverter ratings, critical loads and backup battery. */
import { computed } from 'vue'
import { ResultStat } from '../ui'
import { percentOfUse } from './share'
import { useCalculator } from '../../composables/calculator'
import { batteryText, fmt } from '../../lib/diagram'

const { inputs, hybrid: r } = useCalculator()
const allInOne = computed(() => inputs.hybridSetup === 'all-in-one')
</script>
