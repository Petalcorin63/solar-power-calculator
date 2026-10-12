<template>
  <div class="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <div class="max-w-3xl mx-auto px-6 pt-6 pb-16">
      <AccountMenu :workspace="workspace" class="mb-8" />

      <header class="text-center mb-10">
        <p class="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3">
          Solar sizing
        </p>
        <h1 class="text-4xl md:text-5xl font-extrabold mb-4">Solar Power System Calculator</h1>
        <p class="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          List what you need to power, and get a starting-point size for your solar
          array, battery bank, and inverter.
        </p>
      </header>

      <section v-if="workspace.user.value" class="mb-10">
        <ProjectsPanel :workspace="workspace" />
      </section>

      <div class="flex justify-center mb-12">
        <SystemTypeToggle
          v-model="systemType"
          :options="systemTypeOptions"
        />
      </div>

      <!-- Household loads -->
      <section class="mb-12">
        <h2 class="text-lg font-bold mb-1">Household loads</h2>
        <p class="text-sm text-gray-400 mb-4">
          {{ systemType === 'off-grid'
            ? 'Everything the system needs to power, day to day.'
            : 'Used to estimate your annual usage below — adjust the figure if your utility bill says otherwise.' }}
        </p>
        <ApplianceTable v-model="appliances" />
      </section>

      <!-- Sun & panel parameters (all modes) -->
      <section class="mb-12">
        <h2 class="text-lg font-bold mb-4">Sun &amp; panel parameters</h2>
        <div class="grid sm:grid-cols-2 gap-5">
          <NumberField
            v-model="peakSunHours"
            v-bind="LIMITS.peakSunHours"
            label="Peak sun hours"
            suffix="hrs/day"
            hint="For your location — look it up with PVWatts (see Formulas & references)"
            :step="0.1"
          />
          <NumberField
            v-model="systemDeratePercent"
            v-bind="LIMITS.systemDeratePercent"
            label="System derate"
            suffix="%"
            hint="Wiring, temperature & inverter losses"
            :step="1"
          />
          <NumberField
            v-model="panelWatts"
            v-bind="LIMITS.panelWatts"
            label="Panel wattage"
            suffix="W / panel"
          />
          <NumberField
            v-if="systemType !== 'off-grid'"
            v-model="dcAcRatio"
            v-bind="LIMITS.dcAcRatio"
            label="DC:AC ratio"
            hint="Array size vs. grid-tie inverter rating"
            :step="0.05"
          />
        </div>
      </section>

      <!-- Grid-tied / hybrid: usage & offset -->
      <section v-if="systemType !== 'off-grid'" class="mb-12">
        <h2 class="text-lg font-bold mb-4">Usage &amp; offset target</h2>
        <div class="grid sm:grid-cols-2 gap-5">
          <NumberField
            v-model="annualUsageKwh"
            v-bind="LIMITS.annualUsageKwh"
            label="Annual usage"
            suffix="kWh/yr"
            :hint="`From your utility bill — household loads above suggest ≈ ${formatNumber(suggestedAnnualKwh)} kWh/yr`"
          />
          <NumberField
            v-model="offsetPercent"
            v-bind="LIMITS.offsetPercent"
            label="Offset target"
            suffix="%"
            hint="Share of annual usage the array should cover"
            :step="5"
          />
        </div>
      </section>

      <!-- Off-grid: battery system parameters -->
      <section v-if="systemType === 'off-grid'" class="mb-12">
        <h2 class="text-lg font-bold mb-4">Battery system parameters</h2>
        <div class="grid sm:grid-cols-2 gap-5">
          <SelectField
            v-model="systemVoltage"
            label="System voltage"
            :options="voltageOptions"
          />
          <NumberField
            v-model="daysOfAutonomy"
            v-bind="LIMITS.daysOfAutonomy"
            label="Days of autonomy"
            suffix="days"
            hint="Battery reserve for cloudy days"
            :step="0.5"
          />
          <SelectField
            v-model="batteryChemistry"
            label="Battery chemistry"
            :options="batteryOptions"
          />
          <NumberField
            v-model="batteryAh"
            v-bind="LIMITS.batteryAh"
            label="Battery capacity"
            suffix="Ah / unit"
          />
          <SelectField
            v-model="batteryVoltage"
            label="Battery voltage"
            :options="batteryVoltageOptions"
          />
          <NumberField
            v-model="inverterMarginPercent"
            v-bind="LIMITS.inverterMarginPercent"
            label="Inverter safety margin"
            suffix="%"
            :step="5"
          />
        </div>
      </section>

      <!-- Hybrid: critical loads + backup battery -->
      <template v-if="systemType === 'hybrid'">
        <section class="mb-12">
          <h2 class="text-lg font-bold mb-1">Critical loads</h2>
          <p class="text-sm text-gray-400 mb-4">
            Only what the battery needs to carry during a grid outage — fridge, a few
            lights, wifi, not the whole house.
          </p>
          <ApplianceTable v-model="criticalAppliances" />
        </section>

        <section class="mb-12">
          <h2 class="text-lg font-bold mb-4">Backup battery parameters</h2>
          <div class="grid sm:grid-cols-2 gap-5">
            <SelectField
              v-model="systemVoltage"
              label="System voltage"
              :options="voltageOptions"
            />
            <NumberField
              v-model="backupDays"
              v-bind="LIMITS.backupDays"
              label="Backup days"
              suffix="days"
              hint="Outage length the battery should cover"
              :step="0.5"
            />
            <SelectField
              v-model="batteryChemistry"
              label="Battery chemistry"
              :options="batteryOptions"
            />
            <NumberField
              v-model="batteryAh"
              v-bind="LIMITS.batteryAh"
              label="Battery capacity"
              suffix="Ah / unit"
            />
            <SelectField
              v-model="batteryVoltage"
              label="Battery voltage"
              :options="batteryVoltageOptions"
            />
            <NumberField
              v-model="inverterMarginPercent"
              v-bind="LIMITS.inverterMarginPercent"
              label="Inverter safety margin"
              suffix="%"
              :step="5"
            />
          </div>
        </section>
      </template>

      <!-- Results -->
      <section class="mb-12">
        <h2 class="text-lg font-bold mb-4">Results</h2>

        <div v-if="systemType === 'off-grid'" class="grid sm:grid-cols-2 gap-5">
          <ResultStat
            label="Daily energy use"
            :value="formatNumber(offGridResults.dailyLoadWh)"
            unit="Wh/day"
            :hint="`${formatNumber(offGridResults.dailyLoadWh / 1000, 2)} kWh/day`"
          />
          <ResultStat
            label="Peak simultaneous load"
            :value="formatNumber(offGridResults.peakLoadW)"
            unit="W"
            hint="All listed appliances running at once"
          />
          <ResultStat
            label="Solar array needed"
            :value="formatNumber(offGridResults.arrayWattsNeeded)"
            unit="W"
            :hint="`${offGridResults.panelCount} × ${panelWatts}W panel(s) = ${formatNumber(offGridResults.installedArrayWatts)} W installed`"
          />
          <ResultStat
            label="Battery bank needed"
            :value="formatNumber(offGridResults.batteryBankAh)"
            unit="Ah"
            :hint="`${formatNumber(offGridResults.batteryBankWh)} Wh · ${batteryLayoutText(offGridResults.batteries)}`"
          />
          <ResultStat
            label="Charge controller"
            :value="formatNumber(offGridResults.chargeControllerAmps)"
            unit="A minimum"
            :hint="`For ${formatNumber(offGridResults.installedArrayWatts)} W installed — MPPT, size up to nearest standard rating`"
          />
          <ResultStat
            label="Inverter"
            :value="formatNumber(offGridResults.inverterWatts)"
            unit="W continuous"
            hint="Check surge rating separately for motor loads"
          />
        </div>

        <div v-else-if="systemType === 'grid-tied'" class="grid sm:grid-cols-2 gap-5">
          <ResultStat
            label="Solar array needed"
            :value="formatNumber(gridTiedResults.arrayWattsNeeded)"
            unit="W"
            :hint="`${gridTiedResults.panelCount} × ${panelWatts}W panel(s) = ${formatNumber(gridTiedResults.installedArrayWatts)} W installed`"
          />
          <ResultStat
            label="Estimated production"
            :value="formatNumber(gridTiedResults.estimatedAnnualProductionKwh)"
            unit="kWh/yr"
            :hint="`${formatNumber(productionOffset(gridTiedResults.estimatedAnnualProductionKwh))}% of ${formatNumber(annualUsageKwh)} kWh/yr usage (target ${offsetPercent}%)`"
          />
          <ResultStat
            label="Grid-tie inverter"
            :value="formatNumber(gridTiedResults.inverterWatts)"
            unit="W AC"
            :hint="`${formatNumber(gridTiedResults.installedArrayWatts)} W DC ÷ ${dcAcRatio} DC:AC — no battery needed`"
          />
        </div>

        <div v-else class="grid sm:grid-cols-2 gap-5">
          <ResultStat
            label="Solar array needed"
            :value="formatNumber(hybridResults.arrayWattsNeeded)"
            unit="W"
            :hint="`${hybridResults.panelCount} × ${panelWatts}W panel(s) = ${formatNumber(hybridResults.installedArrayWatts)} W installed`"
          />
          <ResultStat
            label="Estimated production"
            :value="formatNumber(hybridResults.estimatedAnnualProductionKwh)"
            unit="kWh/yr"
            :hint="`${formatNumber(productionOffset(hybridResults.estimatedAnnualProductionKwh))}% of ${formatNumber(annualUsageKwh)} kWh/yr usage (target ${offsetPercent}%)`"
          />
          <ResultStat
            label="Grid-tie / charging inverter"
            :value="formatNumber(hybridResults.gridTieInverterWatts)"
            unit="W AC"
            hint="Handles day-to-day export & battery charging"
          />
          <ResultStat
            label="Critical peak load"
            :value="formatNumber(hybridResults.criticalPeakW)"
            unit="W"
            hint="Critical loads list running at once"
          />
          <ResultStat
            label="Backup battery needed"
            :value="formatNumber(hybridResults.batteryBankAh)"
            unit="Ah"
            :hint="`${formatNumber(hybridResults.batteryBankWh)} Wh · ${batteryLayoutText(hybridResults.batteries)}`"
          />
          <ResultStat
            label="Backup inverter"
            :value="formatNumber(hybridResults.backupInverterWatts)"
            unit="W continuous"
            hint="Sized to the critical loads list only"
          />
        </div>
      </section>

      <!-- Shown right after the results, not inside the collapsed panel, so it can't be missed. -->
      <DisclaimerNote class="mb-6" />

      <!-- Formulas & references -->
      <section>
        <ReferencesPanel :system-type="systemType" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ApplianceTable from './components/ApplianceTable.vue'
import NumberField from './components/NumberField.vue'
import SelectField from './components/SelectField.vue'
import SystemTypeToggle from './components/SystemTypeToggle.vue'
import ResultStat from './components/ResultStat.vue'
import ReferencesPanel from './components/ReferencesPanel.vue'
import DisclaimerNote from './components/DisclaimerNote.vue'
import AccountMenu from './components/AccountMenu.vue'
import ProjectsPanel from './components/ProjectsPanel.vue'
import { useWorkspace } from './composables/useWorkspace'
import { LIMITS, defaultProjectState, type ProjectState } from './lib/project'
import {
  BATTERY_LABELS,
  SYSTEM_TYPE_LABELS,
  calculateOffGrid,
  calculateGridTied,
  calculateHybrid,
  dailyLoadWh,
  type Appliance,
  type BatteryLayout,
  type BatteryChemistry,
  type SystemType,
  type SystemVoltage,
} from './lib/solar'

const initial = defaultProjectState()

const systemType = ref<SystemType>(initial.systemType)
const systemTypeOptions = (Object.keys(SYSTEM_TYPE_LABELS) as SystemType[]).map(value => ({
  value,
  label: SYSTEM_TYPE_LABELS[value],
}))

const appliances = ref<Appliance[]>(initial.appliances)
const criticalAppliances = ref<Appliance[]>(initial.criticalAppliances)

// Shared
const peakSunHours = ref(initial.peakSunHours)
const systemDeratePercent = ref(initial.systemDeratePercent)
const panelWatts = ref(initial.panelWatts)
const systemVoltage = ref<SystemVoltage>(initial.systemVoltage)
const batteryChemistry = ref<BatteryChemistry>(initial.batteryChemistry)
const batteryAh = ref(initial.batteryAh)
const batteryVoltage = ref<SystemVoltage>(initial.batteryVoltage)
const inverterMarginPercent = ref(initial.inverterMarginPercent)

// Off-grid only
const daysOfAutonomy = ref(initial.daysOfAutonomy)

// Grid-tied / hybrid
const suggestedAnnualKwh = computed(() => (dailyLoadWh(appliances.value) * 365) / 1000)
const annualUsageKwh = ref(initial.annualUsageKwh)
const offsetPercent = ref(initial.offsetPercent)
const dcAcRatio = ref(initial.dcAcRatio)

// Hybrid only
const backupDays = ref(initial.backupDays)

// ---- Saving & accounts ----------------------------------------------------

/** Snapshot of every input; appliances are copied so edits inside the tables are tracked too. */
const projectState = computed<ProjectState>(() => ({
  version: 1,
  systemType: systemType.value,
  appliances: appliances.value.map(a => ({ ...a })),
  criticalAppliances: criticalAppliances.value.map(a => ({ ...a })),
  peakSunHours: peakSunHours.value,
  systemDeratePercent: systemDeratePercent.value,
  panelWatts: panelWatts.value,
  systemVoltage: systemVoltage.value,
  batteryChemistry: batteryChemistry.value,
  batteryAh: batteryAh.value,
  batteryVoltage: batteryVoltage.value,
  inverterMarginPercent: inverterMarginPercent.value,
  daysOfAutonomy: daysOfAutonomy.value,
  annualUsageKwh: annualUsageKwh.value,
  offsetPercent: offsetPercent.value,
  dcAcRatio: dcAcRatio.value,
  backupDays: backupDays.value,
}))

function restoreProjectState(state: ProjectState) {
  systemType.value = state.systemType
  appliances.value = state.appliances
  criticalAppliances.value = state.criticalAppliances
  peakSunHours.value = state.peakSunHours
  systemDeratePercent.value = state.systemDeratePercent
  panelWatts.value = state.panelWatts
  systemVoltage.value = state.systemVoltage
  batteryChemistry.value = state.batteryChemistry
  batteryAh.value = state.batteryAh
  batteryVoltage.value = state.batteryVoltage
  inverterMarginPercent.value = state.inverterMarginPercent
  daysOfAutonomy.value = state.daysOfAutonomy
  annualUsageKwh.value = state.annualUsageKwh
  offsetPercent.value = state.offsetPercent
  dcAcRatio.value = state.dcAcRatio
  backupDays.value = state.backupDays
}

const workspace = useWorkspace(projectState, restoreProjectState)
onMounted(() => workspace.init())

const voltageOptions = [
  { value: 12 as SystemVoltage, label: '12V' },
  { value: 24 as SystemVoltage, label: '24V' },
  { value: 48 as SystemVoltage, label: '48V' },
]

// Units are wired in series up to system voltage, so a unit can't exceed it.
const batteryVoltageOptions = computed(() =>
  voltageOptions.filter(option => option.value <= systemVoltage.value),
)
watch(systemVoltage, v => {
  if (batteryVoltage.value > v) batteryVoltage.value = v
})

const batteryOptions = (Object.keys(BATTERY_LABELS) as BatteryChemistry[]).map(value => ({
  value,
  label: BATTERY_LABELS[value],
}))

const offGridResults = computed(() => calculateOffGrid({
  appliances: appliances.value,
  peakSunHours: peakSunHours.value,
  systemDerate: systemDeratePercent.value / 100,
  systemVoltage: systemVoltage.value,
  daysOfAutonomy: daysOfAutonomy.value,
  batteryChemistry: batteryChemistry.value,
  panelWatts: panelWatts.value,
  batteryAh: batteryAh.value,
  batteryVoltage: batteryVoltage.value,
  inverterSafetyMargin: 1 + inverterMarginPercent.value / 100,
  controllerSafetyMargin: 1.25,
}))

const gridTiedResults = computed(() => calculateGridTied({
  annualUsageKwh: annualUsageKwh.value,
  offsetPercent: offsetPercent.value,
  peakSunHours: peakSunHours.value,
  systemDerate: systemDeratePercent.value / 100,
  panelWatts: panelWatts.value,
  dcAcRatio: dcAcRatio.value,
}))

const hybridResults = computed(() => calculateHybrid({
  annualUsageKwh: annualUsageKwh.value,
  offsetPercent: offsetPercent.value,
  peakSunHours: peakSunHours.value,
  systemDerate: systemDeratePercent.value / 100,
  panelWatts: panelWatts.value,
  dcAcRatio: dcAcRatio.value,
  criticalAppliances: criticalAppliances.value,
  backupDays: backupDays.value,
  systemVoltage: systemVoltage.value,
  batteryChemistry: batteryChemistry.value,
  batteryAh: batteryAh.value,
  batteryVoltage: batteryVoltage.value,
  inverterSafetyMargin: 1 + inverterMarginPercent.value / 100,
}))

function batteryLayoutText(layout: BatteryLayout): string {
  if (layout.total === 0) return 'no batteries needed'
  const unit = `${batteryAh.value}Ah ${batteryVoltage.value}V`
  return layout.series > 1
    ? `${layout.total} × ${unit} (${layout.series} in series × ${layout.parallel} parallel)`
    : `${layout.total} × ${unit}`
}

function productionOffset(productionKwh: number): number {
  return annualUsageKwh.value > 0 ? (productionKwh / annualUsageKwh.value) * 100 : 0
}

function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}
</script>
