<template>
  <div class="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 dark:bg-gray-900 text-xs uppercase tracking-widest text-gray-400">
        <tr>
          <th class="text-left font-semibold px-4 py-3">Appliance</th>
          <th class="text-right font-semibold px-4 py-3">Watts</th>
          <th class="text-right font-semibold px-4 py-3">Hrs / day</th>
          <th class="text-right font-semibold px-4 py-3">Qty</th>
          <th class="px-4 py-3" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="appliance in appliances"
          :key="appliance.id"
          class="border-t border-gray-100 dark:border-gray-800"
        >
          <td class="px-4 py-2">
            <input
              v-model="appliance.name"
              type="text"
              class="w-full bg-transparent focus:outline-none"
            >
          </td>
          <td class="px-4 py-2 text-right">
            <NumberCell
              v-model="appliance.watts"
              :label="`${appliance.name} watts`"
              v-bind="LIMITS.applianceWatts"
              class="w-20"
            />
          </td>
          <td class="px-4 py-2 text-right">
            <NumberCell
              v-model="appliance.hours"
              :label="`${appliance.name} hours per day`"
              v-bind="LIMITS.applianceHours"
              :step="0.5"
              class="w-16"
            />
          </td>
          <td class="px-4 py-2 text-right">
            <NumberCell
              v-model="appliance.quantity"
              :label="`${appliance.name} quantity`"
              v-bind="LIMITS.applianceQuantity"
              class="w-14"
            />
          </td>
          <td class="px-4 py-2 text-right">
            <button
              type="button"
              class="w-7 h-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
              aria-label="Remove appliance"
              @click="remove(appliance.id)"
            >
              <span class="text-xs">✕</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <button
    type="button"
    class="mt-4 px-5 py-2.5 border-2 border-amber-600 text-amber-600 dark:text-amber-400 dark:border-amber-400 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500 dark:hover:border-amber-500 rounded-full text-sm font-semibold transition-all"
    @click="add"
  >
    + Add appliance
  </button>
</template>

<script setup lang="ts">
import { LIMITS } from '../lib/project'
import type { Appliance } from '../lib/solar'
import NumberCell from './NumberCell.vue'

const appliances = defineModel<Appliance[]>({ required: true })

function add() {
  // Derived on each add (not once at mount) since loading a project replaces the list.
  const id = Math.max(0, ...appliances.value.map(a => a.id)) + 1
  appliances.value.push({ id, name: 'New appliance', watts: 0, hours: 0, quantity: 1 })
}

function remove(id: number) {
  appliances.value = appliances.value.filter(a => a.id !== id)
}
</script>
