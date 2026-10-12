<template>
  <details class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 group">
    <summary class="cursor-pointer text-sm font-semibold text-gray-900 dark:text-white select-none">
      Formulas &amp; references
      <span class="text-gray-400 font-normal">— how each number is derived</span>
    </summary>

    <div class="mt-5 space-y-5 text-sm text-gray-600 dark:text-gray-400">
      <div v-if="systemType === 'off-grid'">
        <p :class="formula">
          Array watts = Daily load (Wh) ÷ (Peak sun hours × system derate)
        </p>
        <p class="mt-1.5">
          Off-grid arrays must cover the entire daily load themselves, since there's no
          grid to fill the gap. Peak sun hours (PSH) is the number of hours per day
          equivalent to 1,000 W/m² of irradiance for your location — for off-grid, use your
          worst month rather than the yearly average, or the array will fall short in winter.
          Look yours up with <a :class="link" :href="pvwattsUrl" target="_blank" rel="noopener noreferrer">PVWatts</a><CiteRef id="pvwatts" />.
        </p>
        <p class="mt-1.5">
          The derate factor covers losses between the panels' rating and usable energy.
          PVWatts' defaults — 14% system losses and a 96%-efficient inverter — combine to
          about 0.83<CiteRef id="pvwatts-manual" />. Off-grid energy also passes through the
          battery (LiFePO4 round-trip efficiency is about 92%<CiteRef id="victron-lfp" />),
          giving roughly 0.83 × 0.92 ≈ 0.76, hence the default of {{ defaultDerate }}.
        </p>
      </div>

      <div v-if="systemType === 'grid-tied' || systemType === 'hybrid'">
        <p :class="formula">
          Array watts = (Annual usage × offset %) ÷ (Peak sun hours × 365 × system derate)
        </p>
        <p class="mt-1.5">
          Grid-tied and hybrid arrays only need to offset a target share of your annual
          usage — the grid covers the rest, and net metering can credit surplus you
          export, depending on your state and utility<CiteRef id="doe-homeowner" />. 100%
          offset aims to zero out your annual usage on average, not every single day.
          Panels come in whole units, so the installed array (panel count × panel
          wattage) is usually a bit larger than the minimum — production and the inverter
          are both sized to what's actually installed.
        </p>
        <p class="mt-1.5">
          The default derate of {{ defaultDerate }} is conservative here: PVWatts' default losses work
          out to about 0.83 for a grid-tied system<CiteRef id="pvwatts-manual" />, so the
          default slightly oversizes the array. Cross-check the production estimate
          against <a :class="link" :href="pvwattsUrl" target="_blank" rel="noopener noreferrer">PVWatts</a><CiteRef id="pvwatts" />.
        </p>
      </div>

      <div v-if="systemType === 'grid-tied' || systemType === 'hybrid'">
        <p :class="formula">
          Grid-tie inverter (W) = Installed array watts ÷ DC:AC ratio
        </p>
        <p class="mt-1.5">
          Grid-tie inverters are commonly sized smaller than the array's DC rating, since
          the array rarely reaches its full rated output. For individual systems this
          DC:AC (inverter loading) ratio is usually between 1.13 and 1.30<CiteRef id="eia-ilr" />.
        </p>
      </div>

      <div v-if="systemType === 'off-grid' || systemType === 'hybrid'">
        <p :class="formula">
          Battery bank (Wh) = {{ systemType === 'hybrid' ? 'Critical load (Wh)' : 'Daily load (Wh)' }} × {{ systemType === 'hybrid' ? 'Backup days' : 'Days of autonomy' }} ÷ Depth of discharge
        </p>
        <p class="mt-1.5">
          <template v-if="systemType === 'hybrid'">
            A hybrid battery only needs to cover your chosen critical loads during a
            grid outage, not the whole home — that's what keeps the bank affordable.
          </template>
          <template v-else>
            Days of autonomy is how many cloudy days the bank should cover without any
            sun at all.
          </template>
          Depth of discharge (DoD) is how much of the battery's capacity you use each
          cycle, and deeper cycling wears batteries out faster. This calculator assumes
          {{ percent(DEPTH_OF_DISCHARGE.lithium) }} for LiFePO4 and {{ percent(DEPTH_OF_DISCHARGE.agm) }} for lead-acid. For comparison, one LiFePO4 datasheet
          rates 2,500 cycles at 80% DoD and 5,000 at 50%<CiteRef id="victron-lfp" />,
          and one AGM datasheet rates 400 cycles at 80%, 600 at 50% and 1,500 at
          30%<CiteRef id="victron-agm" />. Use your own battery's ratings where you can.
        </p>
        <p :class="[formula, 'mt-3']">
          Batteries = (System voltage ÷ Battery voltage) in series × ⌈Bank Ah ÷ Battery Ah⌉ parallel strings
        </p>
        <p class="mt-1.5">
          Batteries are wired in series to reach the system voltage — e.g. two 12V units
          per string on a 24V system — and each string adds its Ah rating to the bank.
        </p>
      </div>

      <div v-if="systemType === 'off-grid'">
        <p :class="formula">
          Charge controller (A) = Installed array watts ÷ System voltage × Safety margin
        </p>
        <p class="mt-1.5">
          The 1.25× margin mirrors the 125% factor the US National Electrical Code applies
          to PV circuit currents<CiteRef id="nec-690" />, so the controller isn't run at
          its maximum continuous rating. MPPT controllers are assumed here, since they
          track the array's actual operating voltage rather than clamping to battery
          voltage like PWM. Check the controller's own maximum PV input voltage and
          current against your array's datasheet values too.
        </p>
      </div>

      <p v-if="systemType === 'hybrid'">
        Battery charging in a hybrid system usually runs through the hybrid inverter (or
        an AC-coupled battery inverter), so check that unit's charge rating rather than
        sizing a separate charge controller for the whole array.
      </p>

      <div v-if="systemType === 'off-grid'">
        <p :class="formula">
          Inverter (W) = Peak simultaneous load × Safety margin
        </p>
        <p class="mt-1.5">
          Peak load sums every appliance's wattage as if they all ran at once — the
          worst case. Motors and compressors (fridges, pumps, power tools) draw a
          starting surge several times their running power for a moment, so also check
          your inverter's surge rating against the starting surge of your largest motor
          load, from that appliance's documentation.
        </p>
      </div>

      <div v-if="systemType === 'hybrid'">
        <p :class="formula">
          Backup inverter (W) = Critical peak load × Safety margin
        </p>
        <p class="mt-1.5">
          Sized the same way as an off-grid inverter, but against only your critical
          loads list — that's all the battery needs to carry during an outage. As with
          off-grid, check the surge rating separately against any motor loads on that list.
        </p>
      </div>

      <section class="pt-4 border-t border-gray-100 dark:border-gray-800" aria-labelledby="references-heading">
        <h3 id="references-heading" class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          References
        </h3>
        <ol class="space-y-2 text-xs">
          <li v-for="(source, index) in REFERENCES" :id="`ref-${source.id}`" :key="source.id" class="flex gap-2">
            <span class="text-gray-400 tabular-nums">[{{ index + 1 }}]</span>
            <span>
              {{ source.author }}. <a :class="link" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>.
              {{ source.publisher }}<template v-if="source.detail">, {{ source.detail }}</template>.
              <span class="text-gray-500 dark:text-gray-300">Published/updated: {{ source.updated }}.</span>
              Accessed {{ formatIsoDate(source.accessed) }}.
              <span class="block text-gray-400">Used for: {{ source.supports }}</span>
            </span>
          </li>
        </ol>
        <p class="mt-3 text-xs text-gray-400">
          References last reviewed {{ formatIsoDate(REFERENCES_REVIEWED) }}. Datasheet figures
          are examples from specific products; your equipment's ratings take precedence.
        </p>
      </section>
    </div>
  </details>
</template>

<script setup lang="ts">
import { defaultProjectState } from '../lib/project'
import { DEPTH_OF_DISCHARGE, type SystemType } from '../lib/solar'
import { REFERENCES, REFERENCES_REVIEWED, formatIsoDate } from '../lib/references'
import CiteRef from './CiteRef.vue'

defineProps<{
  systemType: SystemType
}>()

const formula = 'font-mono text-xs bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200'
const link = 'text-amber-600 dark:text-amber-400 underline underline-offset-2'
const pvwattsUrl = REFERENCES.find(r => r.id === 'pvwatts')!.url

// Rendered from the code's own defaults so the explanation can't drift from the math.
const defaultDerate = defaultProjectState().systemDeratePercent / 100
const percent = (fraction: number) => `${Math.round(fraction * 100)}%`
</script>
