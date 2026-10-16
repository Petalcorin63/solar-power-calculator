<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <ResultStat
      label="Daily energy use"
      tone="sky"
      icon="home"
      :value="fmt(r.dailyLoadWh)"
      unit="Wh/day"
      :hint="`${fmt(r.dailyLoadWh / WH_PER_KWH, 2)} kWh/day`"
    />
    <ResultStat
      label="Peak load (all on at once)"
      tone="sky"
      icon="plug"
      :value="fmt(r.peakLoadW)"
      unit="W"
      hint="Every listed appliance running at the same time"
    />
    <ResultStat
      label="Solar panels needed"
      tone="amber"
      icon="panel"
      :value="fmt(r.arrayWattsNeeded)"
      unit="W"
      :hint="`${r.panelCount} × ${inputs.panelWatts} W panel(s) = ${fmt(r.installedArrayWatts)} W installed`"
    />
    <ResultStat
      label="Battery bank needed"
      tone="emerald"
      icon="battery"
      :value="fmt(r.batteryBankAh)"
      unit="Ah"
      :hint="`${fmt(r.batteryBankWh)} Wh · ${batteryText(r.batteries, inputs.batteryAh, inputs.batteryVoltage)}`"
    />
    <ResultStat
      :label="allInOne ? 'Built-in solar charger needed' : 'Charge controller (MPPT)'"
      tone="orange"
      icon="controller"
      :value="fmt(r.chargeControllerAmps)"
      unit="A minimum"
      :hint="allInOne
        ? `Your all-in-one unit's max solar charging current should be at least this, for ${fmt(r.installedArrayWatts)} W of panels`
        : `For ${fmt(r.installedArrayWatts)} W of panels — round up to the next size sold`"
    />
    <ResultStat
      :label="allInOne ? 'All-in-one inverter' : 'Inverter'"
      tone="violet"
      icon="inverter"
      :value="fmt(r.inverterWatts)"
      unit="W continuous"
      hint="Check its surge rating separately for motors (fridges, pumps)"
    />
  </div>
</template>

<script setup lang="ts">
/** Results tab, off-grid: loads, panels, battery bank, charge controller and inverter. */
import { computed } from 'vue'
import { ResultStat } from '../ui'
import { useCalculator } from '../../composables/calculator'
import { batteryText, fmt } from '../../lib/diagram'
import { WH_PER_KWH } from '../../lib/sizing'

const { inputs, offGrid: r } = useCalculator()
const allInOne = computed(() => inputs.offGridSetup === 'all-in-one')
</script>
