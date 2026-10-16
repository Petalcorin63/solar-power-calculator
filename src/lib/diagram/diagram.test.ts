import { describe, expect, it } from 'vitest'
import { describeSystem, isReady, type PartId } from '.'
import { defaultProjectState, type ProjectState } from '../project'
import type { SystemType } from '../sizing'

const state = (overrides: Partial<ProjectState> = {}): ProjectState => ({ ...defaultProjectState(), ...overrides })

const datasheet = { panelVoc: 37, panelVmp: 31, panelIsc: 13.9 }
const lengths = { pvRunM: 15, chargeRunM: 2, batteryRunM: 2, loadRunM: 10, gridRunM: 10 }

describe('describeSystem', () => {
  it.each<SystemType>(['off-grid', 'grid-tied', 'hybrid'])('%s: every link and prerequisite points to a part on the diagram', type => {
    const d = describeSystem(state({ systemType: type }))
    for (const node of d.nodes) expect(d.parts[node]).toBeDefined()
    for (const c of d.circuits) {
      expect(d.parts[`wire:${c.id}`]).toBeDefined()
      expect(d.parts[`breaker:${c.id}`]).toBeDefined()
    }
    for (const part of Object.values(d.parts)) {
      for (const id of part.related) expect(d.parts[id], `${part.id} → ${id}`).toBeDefined()
      for (const r of part.requires) if (r.part) expect(d.parts[r.part], `${part.id} needs ${r.part}`).toBeDefined()
    }
  })

  it.each<[string, Partial<ProjectState>]>([
    ['all-in-one', { offGridSetup: 'all-in-one' }],
    ['all-in-one with AC input', { offGridSetup: 'all-in-one', acInputSource: 'grid-generator' }],
  ])('off-grid %s: every link and prerequisite points to a part on the diagram', (_, setup) => {
    const d = describeSystem(state(setup))
    for (const node of d.nodes) expect(d.parts[node]).toBeDefined()
    for (const part of Object.values(d.parts)) {
      for (const id of part.related) expect(d.parts[id], `${part.id} → ${id}`).toBeDefined()
      for (const r of part.requires) if (r.part) expect(d.parts[r.part], `${part.id} needs ${r.part}`).toBeDefined()
    }
  })

  it('draws a hybrid all-in-one fed from the main breaker box, with no export', () => {
    // Defaults: critical loads 1,560 Wh/day at 24 V; backup inverter 190 W × 1.25 = 237.5 W.
    const d = describeSystem(state({ systemType: 'hybrid', hybridSetup: 'all-in-one', acChargeAmps: 30 }))
    expect(d.layout).toBe('hybrid-aio')
    expect(d.circuits.find(c => c.id === 'grid')).toMatchObject({ from: 'loads', to: 'inverter' })
    for (const part of Object.values(d.parts)) {
      for (const id of part.related) expect(d.parts[id], `${part.id} → ${id}`).toBeDefined()
    }
    // Panels: 1,560 Wh ÷ (4.5 h × 0.75) = 462 W → 2 × 400 W
    expect(d.parts.panels!.headline).toBe('2 × 400 W')
    // Battery: max(237.5 ÷ (24 × 0.9) = 11 A, 800 ÷ 24 + 30 = 63.3 A) × 1.25 = 79.2 → 80 A
    expect(d.parts['breaker:battery']!.headline).toBe('80 A')
    // AC in: (237.5 W + 30 A × 24 V × 1.2 ÷ 0.85 = 1,016.5 W) ÷ 240 V = 5.2 A
    expect(d.parts['breaker:grid']!.steps[0]!.result).toBe('5.2 A')
    // Grid: 606 kWh − min(986, 1,560 × 365 ÷ 1,000 = 569.4) = 36.6 kWh bought, nothing exported
    expect(d.parts.grid!.headline).toBe('imports 37 kWh/yr')
    expect(d.parts.inverter!.title).toContain('All-in-one')
  })

    it('drops the separate charge controller for an all-in-one inverter', () => {
    const separate = describeSystem(state())
    const aio = describeSystem(state({ offGridSetup: 'all-in-one' }))
    const aioAc = describeSystem(state({ offGridSetup: 'all-in-one', acInputSource: 'grid-generator' }))
    expect(separate.layout).toBe('off-grid')
    expect(aio.layout).toBe('off-grid-aio')
    expect(aio.nodes).toEqual(['panels', 'battery', 'inverter', 'loads'])
    expect(aio.circuits.map(c => c.id)).toEqual(['pv', 'battery', 'load'])
    expect(aioAc.nodes).toContain('grid')
    expect(aioAc.circuits.map(c => c.id)).toEqual(['pv', 'battery', 'load', 'grid'])
    // An AC input only exists on the all-in-one drawing.
    expect(describeSystem(state({ acInputSource: 'grid-generator' })).layout).toBe('off-grid')
  })

  it('sizes the all-in-one battery cable for charging as well as discharging', () => {
    // Discharging: 318.75 W ÷ (24 V × 0.9) = 14.8 A. Charging: 800 W ÷ 24 V = 33.3 A solar.
    // Solar only: 33.3 A × 1.25 = 41.7 A → 45 A.
    // Plus 30 A from the AC charger: 63.3 A × 1.25 = 79.2 A → 80 A.
    expect(describeSystem(state({ offGridSetup: 'all-in-one' })).parts['breaker:battery']!.headline).toBe('45 A')
    const withAc = describeSystem(state({ offGridSetup: 'all-in-one', acInputSource: 'grid-generator', acChargeAmps: 30 }))
    expect(withAc.parts['breaker:battery']!.steps[0]!.result).toBe('63.3 A')
    expect(withAc.parts['breaker:battery']!.headline).toBe('80 A')
  })

  it('sizes the all-in-one AC input for pass-through loads plus the charger', () => {
    // 318.75 W loads + 30 A × 24 V × 1.2 ÷ 0.85 = 1,016.5 W charger → 1,335.2 W ÷ 240 V = 5.56 A
    const d = describeSystem(state({ offGridSetup: 'all-in-one', acInputSource: 'grid-generator', acChargeAmps: 30 }))
    expect(d.parts['breaker:grid']!.steps[0]!.result).toBe('5.6 A')
    expect(d.parts.grid!.headline).toBe('1,335 W max')
  })

  it('has the parts each system type actually has', () => {
    const ids = (type: SystemType) => describeSystem(state({ systemType: type })).nodes
    expect(ids('off-grid')).toEqual(['panels', 'controller', 'battery', 'inverter', 'loads'])
    expect(ids('grid-tied')).not.toContain('battery')
    expect(ids('hybrid')).toEqual(expect.arrayContaining(['critical', 'grid', 'loads']))
    expect(ids('hybrid')).not.toContain('controller')
  })

  it('asks for datasheet values and the run length before sizing a wire', () => {
    const wire = describeSystem(state()).parts['wire:pv']!
    expect(isReady(wire)).toBe(false)
    expect(wire.headline).toBe('needs info')
    const missing = wire.requires.filter(r => !r.met).flatMap(r => r.fields)
    expect(missing).toEqual(['panelIsc', 'panelVmp', 'pvRunM'])
  })

  it('sizes breakers without run lengths, since length only affects voltage drop', () => {
    // Off-grid default: 2 × 400 W = 800 W ÷ 24 V = 33.3 A × 1.25 = 41.7 A → 45 A
    const breaker = describeSystem(state()).parts['breaker:charge']!
    expect(isReady(breaker)).toBe(true)
    expect(breaker.headline).toBe('45 A')
  })

  it('shows the wire size once everything is filled in', () => {
    const d = describeSystem(state({ ...datasheet, ...lengths }))
    // Worked through in wiring.test.ts: 25 A breaker, 10 AWG at 2.54% drop over 15 m
    const pv = d.parts['wire:pv']!
    expect(isReady(pv)).toBe(true)
    expect(pv.headline).toBe('10 AWG')
    expect(pv.steps.at(-1)!.result).toBe('10 AWG (5.3 mm²)')
    for (const part of Object.values(d.parts)) expect(isReady(part), part.id).toBe(true)
  })

  it('points back to the critical loads when there are none to back up', () => {
    const d = describeSystem(state({ systemType: 'hybrid', criticalAppliances: [], batteryChargeAmps: 60, ...datasheet, ...lengths }))
    const battery = d.parts.battery!
    expect(isReady(battery)).toBe(false)
    expect(battery.requires.find(r => !r.met)!.part).toBe('critical')
    const unmet = (id: PartId) => d.parts[id]!.requires.filter(r => !r.met).map(r => r.part)
    expect(unmet('wire:battery')).toEqual(['critical'])
    expect(unmet('breaker:load')).toEqual(['critical'])
    // The array side doesn't depend on the critical loads.
    expect(isReady(d.parts['wire:grid']!)).toBe(true)
  })

  it('re-sizes wires and breakers for the selected location', () => {
    // Same PV circuit as wiring.test.ts: NEC → 25 A / 10 AWG; IEC → 20 A / 6 mm² (voltage drop decides)
    const nec = describeSystem(state({ ...datasheet, ...lengths }))
    const iec = describeSystem(state({ ...datasheet, ...lengths, electricalCode: 'iec', acVoltage: 230 }))
    expect([nec.parts['breaker:pv']!.headline, nec.parts['wire:pv']!.headline]).toEqual(['25 A', '10 AWG'])
    expect([iec.parts['breaker:pv']!.headline, iec.parts['wire:pv']!.headline]).toEqual(['20 A', '6 mm²'])
    expect(iec.parts['wire:pv']!.steps.map(s => s.label)).toContain('Current to size for (no extra safety factor under IEC 60364)')
    // AC current follows the location's voltage: 318.75 W ÷ 230 V
    expect(iec.parts['breaker:load']!.steps[0]!.result).toBe('1.4 A')
    expect(iec.parts['wire:pv']!.notes.some(n => n.includes('method C'))).toBe(true)
  })

  it('sizes a grid-interactive hybrid\'s battery cable for charging too, and asks for the rating', () => {
    const missing = describeSystem(state({ systemType: 'hybrid' })).parts['breaker:battery']!
    expect(isReady(missing)).toBe(false)
    expect(missing.requires.filter(r => !r.met).flatMap(r => r.fields)).toEqual(['batteryChargeAmps'])
    // Discharge: 237.5 W ÷ (21 V × 0.85) = 13.3 A. Charging at 60 A wins: 60 × 1.25 = 75 A → 80 A
    const breaker = describeSystem(state({ systemType: 'hybrid', batteryChargeAmps: 60 })).parts['breaker:battery']!
    expect(breaker.steps[0]!.result).toBe('60 A')
    expect(breaker.headline).toBe('80 A')
  })

  it('says the grid balances out rather than "exports -0"', () => {
    expect(describeSystem(state({ systemType: 'grid-tied', annualUsageKwh: 0 })).parts.grid!.headline).toBe('balances out over the year')
  })

  it('checks the coldest-morning string voltage once the temperature is known', () => {
    // 2 panels × 37 V × (1 + −0.27% × (−5 − 25)) = 74 × 1.081 = 79.99 V
    const steps = describeSystem(state({ ...datasheet, lowestTempC: -5 })).parts.controller!.steps
    expect(steps.at(-1)).toMatchObject({ result: '80 V' })
    expect(steps.at(-1)!.label).toContain('coldest morning')
  })

  it('sizes the hybrid inverter to the larger of its two jobs', () => {
    const inverter = describeSystem(state({ systemType: 'hybrid', annualUsageKwh: 10_000 })).parts.inverter!
    // 21 × 400 W = 8,400 W ÷ 1.2 = 7,000 W, far more than the critical loads need
    expect(inverter.headline).toBe('7,000 W')
  })
})
