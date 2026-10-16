<template>
  <div v-if="field === 'appliances' || field === 'criticalAppliances'" class="sm:col-span-2">
    <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {{ field === 'appliances' ? 'Household loads' : 'Critical loads' }}
    </p>
    <ApplianceTable v-model="inputs[field]" />
  </div>

  <SelectField
    v-else-if="field === 'systemVoltage'"
    v-model="inputs.systemVoltage"
    label="Battery bank voltage"
    :options="VOLTAGE_OPTIONS"
  />
  <SelectField
    v-else-if="field === 'batteryVoltage'"
    v-model="inputs.batteryVoltage"
    label="Voltage of one battery"
    :options="VOLTAGE_OPTIONS.filter(o => o.value <= inputs.systemVoltage)"
  />
  <SelectField
    v-else-if="field === 'batteryChemistry'"
    v-model="inputs.batteryChemistry"
    label="Battery type"
    :options="CHEMISTRY_OPTIONS"
  />
  <SelectField
    v-else-if="field === 'acVoltage'"
    v-model="inputs.acVoltage"
    label="AC voltage"
    :options="ELECTRICAL_CODES[inputs.electricalCode].acVoltages.map(value => ({ value, label: `${value}V` }))"
  />
  <SelectField
    v-else-if="field === 'offGridSetup'"
    v-model="inputs.offGridSetup"
    label="Equipment setup"
    :options="OFF_GRID_SETUP_OPTIONS"
  />
  <SelectField
    v-else-if="field === 'hybridSetup'"
    v-model="inputs.hybridSetup"
    label="Equipment setup"
    :options="HYBRID_SETUP_OPTIONS"
  />
  <SelectField
    v-else-if="field === 'acInputSource'"
    v-model="inputs.acInputSource"
    label="AC input (backup charging)"
    :options="AC_INPUT_OPTIONS"
  />
  <SelectField
    v-else-if="field === 'electricalCode'"
    v-model="inputs.electricalCode"
    label="Location / electrical code"
    :options="CODE_OPTIONS"
  />

  <NumberField
    v-else-if="optionalField"
    v-model="inputs[optionalField]"
    optional
    v-bind="OPTIONAL_FIELDS[optionalField]"
    :hint="hint ?? OPTIONAL_FIELDS[optionalField].hint"
  />
  <NumberField
    v-else-if="numberField"
    v-model="inputs[numberField]"
    v-bind="NUMBER_FIELDS[numberField]"
    :hint="hint ?? NUMBER_FIELDS[numberField].hint"
  />
</template>

<script setup lang="ts">
/**
 * Any calculator input, rendered by its key — so the Setup tab and the diagram's
 * "fill these in first" boxes share one definition of each field (data/fields.ts).
 * Edits go straight into the shared calculator inputs.
 */
import { computed } from 'vue'
import ApplianceTable from './ApplianceTable.vue'
import { NumberField, SelectField } from '../ui'
import { NUMBER_FIELDS, OPTIONAL_FIELDS } from './data/fields'
import {
  AC_INPUT_OPTIONS,
  CHEMISTRY_OPTIONS,
  CODE_OPTIONS,
  HYBRID_SETUP_OPTIONS,
  OFF_GRID_SETUP_OPTIONS,
  VOLTAGE_OPTIONS,
} from './data/options'
import { useCalculator } from '../../composables/calculator'
import type { FieldKey } from '../../lib/diagram'
import { ELECTRICAL_CODES } from '../../lib/wiring'

const props = defineProps<{
  field: FieldKey
  /** Replaces the field's usual hint, where the context says something more useful. */
  hint?: string
}>()

const { inputs } = useCalculator()

type OptionalKey = keyof typeof OPTIONAL_FIELDS
type NumberKey = keyof typeof NUMBER_FIELDS

const optionalField = computed(() => (props.field in OPTIONAL_FIELDS ? props.field as OptionalKey : null))
const numberField = computed(() => (props.field in NUMBER_FIELDS ? props.field as NumberKey : null))
</script>
