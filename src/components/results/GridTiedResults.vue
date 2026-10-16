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
      :hint="`${fmt(percentOfUse(r.estimatedAnnualProductionKwh, inputs.annualUsageKwh))}% of your ${fmt(inputs.annualUsageKwh)} kWh/yr (target ${inputs.offsetPercent}%)`"
    />
    <ResultStat
      label="Grid-tie inverter"
      tone="violet"
      icon="inverter"
      :value="fmt(r.inverterWatts)"
      unit="W AC"
      :hint="`${fmt(r.installedArrayWatts)} W of panels ÷ ${inputs.dcAcRatio} ratio — no battery`"
    />
  </div>
</template>

<script setup lang="ts">
/** Results tab, grid-tied: panels, yearly production and the grid-tie inverter. */
import { ResultStat } from '../ui'
import { percentOfUse } from './share'
import { useCalculator } from '../../composables/calculator'
import { fmt } from '../../lib/diagram'

const { inputs, gridTied: r } = useCalculator()
</script>
