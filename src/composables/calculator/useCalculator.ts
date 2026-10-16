/**
 * Creates the calculator state once (in App.vue) and shares it with every tab and
 * nested component through provide/inject, so nothing has to thread it through props.
 *
 *   App.vue:        const calculator = createCalculator(); provideCalculator(calculator)
 *   any component:  const { inputs, offGrid } = useCalculator()
 */
import { computed, inject, provide, reactive, watch, type InjectionKey } from 'vue'
import { describeSystem, isReady } from '../../lib/diagram'
import { defaultProjectState, gridTiedInputs, hybridInputs, offGridInputs, type ProjectState } from '../../lib/project'
import { calculateGridTied, calculateHybrid, calculateOffGrid } from '../../lib/sizing'
import { ELECTRICAL_CODES } from '../../lib/wiring'
import type { Calculator } from './types'

const CALCULATOR_KEY: InjectionKey<Calculator> = Symbol('calculator')

export function createCalculator(): Calculator {
  // Keys keep defaultProjectState()'s order, since saved JSON is compared as a string.
  const inputs: ProjectState = reactive(defaultProjectState())

  // Batteries are wired in series up to the bank voltage, so one unit can't exceed it.
  watch(() => inputs.systemVoltage, bankVoltage => {
    if (inputs.batteryVoltage > bankVoltage) inputs.batteryVoltage = bankVoltage
  })
  // Each location has its own supply voltages (no 120 V outside North America).
  watch(() => inputs.electricalCode, id => {
    const code = ELECTRICAL_CODES[id]
    if (!code.acVoltages.includes(inputs.acVoltage)) inputs.acVoltage = code.defaultAcVoltage
  })

  const diagram = computed(() => describeSystem(inputs))

  return {
    inputs,
    offGrid: computed(() => calculateOffGrid(offGridInputs(inputs))),
    gridTied: computed(() => calculateGridTied(gridTiedInputs(inputs))),
    hybrid: computed(() => calculateHybrid(hybridInputs(inputs))),
    diagram,
    needsInfoCount: computed(() => Object.values(diagram.value.parts).filter(part => !isReady(part)).length),
    // Appliances are copied so edits inside the tables register as changes too.
    snapshot: computed(() => ({
      ...inputs,
      appliances: inputs.appliances.map(a => ({ ...a })),
      criticalAppliances: inputs.criticalAppliances.map(a => ({ ...a })),
    })),
    restore: state => { Object.assign(inputs, state) },
  }
}

export function provideCalculator(calculator: Calculator): void {
  provide(CALCULATOR_KEY, calculator)
}

export function useCalculator(): Calculator {
  const calculator = inject(CALCULATOR_KEY)
  if (!calculator) throw new Error('useCalculator() needs App.vue to call provideCalculator() first')
  return calculator
}
