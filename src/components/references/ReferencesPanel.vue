<template>
  <section class="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6" aria-labelledby="references-heading">
    <h2 id="references-heading" class="text-lg font-bold text-gray-900 dark:text-white">
      Formulas &amp; references
    </h2>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">How each number is derived, for the setup you've picked, and the sources behind it.</p>

    <div class="mt-5 space-y-5 text-sm text-gray-600 dark:text-gray-400">
      <!-- ---- Panels ---- -->
      <div v-if="offGrid">
        <p :class="formula">
          Panel watts = Daily load (Wh) ÷ (Peak sun hours × system derate)
        </p>
        <p class="mt-1.5">
          Off-grid panels must cover the entire daily load themselves, since there's no
          grid to fill the gap. Peak sun hours (PSH) is the number of hours per day
          equivalent to 1,000 W/m² of irradiance for your location — for off-grid, use your
          worst month rather than the yearly average, or the panels will fall short in winter.
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

      <div v-else-if="hybridAllInOne">
        <p :class="formula">
          Panel watts = Critical load (Wh/day) × share covered by solar ÷ (Peak sun hours × system derate)
        </p>
        <p class="mt-1.5">
          An all-in-one inverter can't export to the grid, so solar only reaches the loads
          on its output. The panels are sized to those critical loads rather than your
          whole bill; anything they produce beyond that is curtailed. Cross-check the
          production estimate against <a :class="link" :href="pvwattsUrl" target="_blank" rel="noopener noreferrer">PVWatts</a><CiteRef id="pvwatts" />.
        </p>
      </div>

      <div v-else>
        <p :class="formula">
          Panel watts = (Yearly use × share covered by solar) ÷ (Peak sun hours × 365 × system derate)
        </p>
        <p class="mt-1.5">
          Grid-tied and grid-interactive hybrid panels only need to cover a target share of
          your yearly use — the grid covers the rest, and net metering can credit surplus you
          export, depending on your state and utility<CiteRef id="doe-homeowner" />. 100%
          aims to zero out your yearly use on average, not every single day. Panels come in
          whole units, so the installed panel power is usually a bit larger than the
          minimum — production and the inverter are both sized to what's actually installed.
        </p>
        <p class="mt-1.5">
          The default derate of {{ defaultDerate }} is conservative here: PVWatts' default losses work
          out to about 0.83 for a grid-tied system<CiteRef id="pvwatts-manual" />, so the
          default slightly oversizes the panels. Cross-check the production estimate
          against <a :class="link" :href="pvwattsUrl" target="_blank" rel="noopener noreferrer">PVWatts</a><CiteRef id="pvwatts" />.
        </p>
      </div>

      <div v-if="gridTieRating">
        <p :class="formula">
          Grid-tie inverter (W) = Installed panel watts ÷ DC:AC ratio
        </p>
        <p class="mt-1.5">
          Grid-tie inverters are commonly sized smaller than the panels' DC rating, since
          panels rarely reach their full rated output. For individual systems this
          DC:AC (inverter loading) ratio is usually between 1.13 and 1.30<CiteRef id="eia-ilr" />.
        </p>
      </div>

      <div>
        <p :class="formula">
          Coldest-morning string voltage = Panels in series × Voc × (1 + γ × (T_min − 25 °C))
        </p>
        <p class="mt-1.5">
          Panel voltage rises as cells get colder, so a controller or inverter must handle
          the string's voltage on the coldest morning, not at 25 °C. γ is the panel's Voc
          temperature coefficient from its datasheet (negative, around −0.27 %/°C) and
          T_min the lowest temperature recorded for your area<CiteRef id="cec-5033" />.
        </p>
      </div>

      <!-- ---- Battery ---- -->
      <div v-if="offGrid || hybrid">
        <p :class="formula">
          Battery bank (Wh) = {{ hybrid ? 'Critical load (Wh)' : 'Daily load (Wh)' }} × {{ hybrid ? 'Outage length (days)' : 'Days without sun' }} ÷ Depth of discharge
        </p>
        <p class="mt-1.5">
          <template v-if="hybrid">
            A hybrid battery only needs to cover your chosen critical loads during a
            grid outage, not the whole home — that's what keeps the bank affordable.
          </template>
          <template v-else>
            Days without sun (days of autonomy) is how many cloudy days the bank should
            cover with no solar at all.
          </template>
          Depth of discharge (DoD) is how much of the battery's capacity you use each
          cycle, and deeper cycling wears batteries out faster. This calculator assumes
          {{ percent(DEPTH_OF_DISCHARGE.lithium) }} for LiFePO4 and {{ percent(DEPTH_OF_DISCHARGE.agm) }} for lead-acid. For comparison, one LiFePO4 datasheet
          rates 2,500 cycles at 80% DoD and 5,000 at 50%<CiteRef id="victron-lfp" />,
          and one AGM datasheet rates 400 cycles at 80%, 600 at 50% and 1,500 at
          30%<CiteRef id="victron-agm" />. Use your own battery's ratings where you can.
        </p>
        <p :class="[formula, 'mt-3']">
          Batteries = (Battery bank voltage ÷ Battery voltage) in series × ⌈Bank Ah ÷ Battery Ah⌉ parallel strings
        </p>
        <p class="mt-1.5">
          Batteries are wired in series to reach the bank voltage — e.g. two 12V units
          per string on a 24V bank — and each string adds its Ah rating to the bank.
        </p>
      </div>

      <!-- ---- Charging and inverters ---- -->
      <div v-if="offGrid">
        <p :class="formula">
          {{ allInOne ? 'Built-in solar charger (A)' : 'Charge controller (A)' }} = Installed panel watts ÷ Battery bank voltage × 1.25
        </p>
        <p class="mt-1.5">
          The 1.25× margin mirrors the 125% factor the US National Electrical Code applies
          to PV circuit currents<CiteRef id="nec-690" />, so the charger isn't run at
          its maximum continuous rating. MPPT charging is assumed, since it tracks the
          panels' actual operating voltage rather than clamping to battery voltage like
          PWM. Check the charger's maximum PV input voltage and current too.
        </p>
      </div>

      <div v-if="allInOne">
        <p :class="formula">
          Battery cable current = max(Inverter draw, Solar charging + AC charging)
        </p>
        <p :class="[formula, 'mt-1.5']">
          AC input (W) = Loads passed through + AC charging current × Battery voltage × 1.2 ÷ 0.85
        </p>
        <p class="mt-1.5">
          An all-in-one inverter combines the inverter, an MPPT solar charger and a battery
          charger, with separate connections — each needing its own breaker — for the panels,
          the battery, the AC input from the grid or a generator, and the AC output to the
          loads<CiteRef id="mpp-manual" />. One cable carries both the battery's discharge and
          its charging, so it's sized for the larger. With grid power on the AC input the
          unit passes it through to the loads while charging, so the AC input carries both.
          The charger's AC draw is worked out at bulk-charge voltage (about 1.2 × nominal,
          e.g. 29.2 V on a 24 V bank) and 85% efficiency<CiteRef id="mpp-manual" />.
        </p>
      </div>

      <p v-if="hybrid && !allInOne">
        Battery charging in a hybrid system runs through the hybrid inverter, so the battery
        cable is sized for the larger of the inverter's draw and its maximum battery charge
        current from the datasheet, rather than sizing a separate charge controller.
      </p>

      <p v-if="hybrid">
        In the diagram, the {{ allInOne ? 'all-in-one' : 'hybrid' }} inverter connects to the grid through the main breaker
        box, the home's single point of interconnection, and feeds a separate backup breaker
        box for the critical loads. In an outage a microgrid interconnect device or transfer
        switch (built into many inverters) isolates the home from the grid<CiteRef id="nrel-qrg" />.
        <template v-if="!allInOne">
          The breaker feeding the inverter into the main breaker box is limited by that box's
          busbar: under the common "120% rule", the main breaker plus 125% of the inverter's
          output can't exceed 120% of the busbar rating<CiteRef id="nrel-qrg" />.
        </template>
      </p>

      <div v-if="offGrid || hybrid">
        <p :class="formula">
          {{ hybrid ? 'Backup inverter' : 'Inverter' }} (W) = {{ hybrid ? 'Critical peak load' : 'Peak simultaneous load' }} × (1 + headroom)
        </p>
        <p class="mt-1.5">
          Peak load sums every appliance's wattage as if they all ran at once — the
          worst case. Motors and compressors (fridges, pumps, power tools) draw a
          starting surge several times their running power for a moment, so also check
          the inverter's surge rating against your largest motor load.
        </p>
      </div>

      <!-- ---- Wires and breakers ---- -->
      <div>
        <p :class="formula">
          Breaker (A) = next standard rating ≥ Circuit current × {{ code.continuousFactor }}
        </p>
        <p :class="[formula, 'mt-1.5']">
          Wire = larger of (smallest wire that breaker may protect, smallest wire within the voltage-drop limit)
        </p>
        <p class="mt-1.5">
          Used for the wires and breakers in the system diagram, following the location
          picked there — currently <strong>{{ code.label }}</strong>. Circuit current is the
          inverter's rated output ÷ AC voltage, or the charge controller's output. Battery
          current is worked out with the battery nearly flat, when the inverter draws the
          most: rated output ÷ (low-voltage cut-off × 85% efficiency), with cut-off at 87.5%
          of nominal (21 V on a 24 V bank)<CiteRef id="mpp-manual" />. The breaker is the next
          standard rating up, and the wire must be rated for at least the breaker.
        </p>
        <p v-if="code.id === 'nec'" class="mt-1.5">
          PV circuits start from the panels' short-circuit current × 1.25, then take the
          same 1.25 again — 1.56 × Isc in all<CiteRef id="nec-690" />. Wire ratings are the
          75 °C copper ampacities, with the lower breaker limits for 14–10 AWG<CiteRef id="nec-wiring" />.
        </p>
        <p v-else-if="code.id === 'pec'" class="mt-1.5">
          The Philippine Electrical Code follows the NEC's approach — the same 1.25 factors
          and standard breaker ratings — with metric wire sizes. Its 75 °C copper ratings
          here come from a secondary source<CiteRef id="pec-tables" />, since the code itself
          isn't freely available; for 2.0–38 mm² they match the NEC values for the
          equivalent AWG sizes<CiteRef id="nec-wiring" />. Check them against PEC 2017 Part 1.
        </p>
        <p v-else-if="code.id === 'iec'" class="mt-1.5">
          Under IEC 60364 the design current must not exceed the breaker rating, which must
          not exceed the cable's current-carrying capacity (I<sub>B</sub> ≤ I<sub>n</sub> ≤ I<sub>z</sub>), with no
          extra 125% margin<CiteRef id="eig-protection" />. PV cables are sized for 1.25 × the
          panels' short-circuit current<CiteRef id="fronius-pv" />. Cable ratings are Table
          B.52.2 of IEC 60364-5-52 (PVC, two loaded conductors, clipped direct)<CiteRef id="iec-tables" />.
          Breaker ratings use the common miniature and moulded-case steps — check the range
          your supplier sells.
        </p>
        <p v-else class="mt-1.5">
          AS/NZS 5033 sets the maximum PV string current at 1.25 × the module
          short-circuit current, and the cable must be rated for at least that<CiteRef id="cec-5033" />.
          Cable ratings are AS/NZS 3008.1.2 Table 3.7 (single-core PVC, single phase,
          touching on a surface) for New Zealand's 30 °C conditions<CiteRef id="nexans-asnzs" />;
          Australia's 3008.1.1 assumes 40 °C and gives lower ratings. Voltage drop from the
          point of supply is limited to 5% overall<CiteRef id="firstflex" />.
        </p>
        <p class="mt-1.5">
          Voltage drop = 2 × one-way length × current × resistance per metre ÷ circuit
          voltage, with copper resistance at 75 °C. AWG resistances come from the NEC's
          conductor table<CiteRef id="nec-wiring" />, which agrees within about 2% with NIST's
          copper wire tables<CiteRef id="nist-copper" />. Metric resistances come from IEC 60228
          and reproduce the published AS/NZS voltage drops within 1.5%<CiteRef id="nexans-asnzs" />.
          No derating is applied for hot roofs, conduit fill or bundled cables, which
          all call for thicker wire — treat the result as a minimum.
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
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CiteRef from './CiteRef.vue'
import { useCalculator } from '../../composables/calculator'
import { isAllInOne, layoutFor } from '../../lib/diagram'
import { defaultProjectState } from '../../lib/project'
import { REFERENCES, REFERENCES_REVIEWED, formatIsoDate, referenceUrl } from '../../lib/references'
import { DEPTH_OF_DISCHARGE } from '../../lib/sizing'
import { ELECTRICAL_CODES } from '../../lib/wiring'

// Explains whichever setup is selected in the shared calculator.
const { inputs } = useCalculator()

const code = computed(() => ELECTRICAL_CODES[inputs.electricalCode])
const layout = computed(() => layoutFor(inputs))
const offGrid = computed(() => inputs.systemType === 'off-grid')
const hybrid = computed(() => inputs.systemType === 'hybrid')
const allInOne = computed(() => isAllInOne(layout.value))
const hybridAllInOne = computed(() => layout.value === 'hybrid-aio')
/** Grid-tied, or a hybrid that can export: these have a DC:AC-sized grid-tie rating. */
const gridTieRating = computed(() => inputs.systemType === 'grid-tied' || layout.value === 'hybrid')

const formula = 'font-mono text-xs bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200'
const link = 'text-amber-600 dark:text-amber-400 underline underline-offset-2'
const pvwattsUrl = referenceUrl('pvwatts')

// Rendered from the code's own defaults so the explanation can't drift from the math.
const defaultDerate = defaultProjectState().systemDeratePercent / 100
const percent = (fraction: number) => `${Math.round(fraction * 100)}%`
</script>
