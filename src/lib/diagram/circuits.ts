/**
 * Wires and breakers. Each circuit's current is worked out first (`circuitCurrent`), then
 * the same current sizes both its breaker and its wire (`circuitParts`).
 */
import {
  INVERTER_EFFICIENCY,
  LOW_BATTERY_FACTOR,
  acCircuit,
  chargeCircuit,
  chargerInputWatts,
  inverterBatteryCircuit,
  nextStandardBreaker,
  pvCircuit,
  sizeBreaker,
  sizeWire,
} from '../wiring'
import type { DiagramContext } from './types'
import { conductorText, fmt, largestBreaker, largestConductor } from './format'
import { NEEDS_INFO, PV_STRING_FUSE_FACTOR } from './constants'
import type { Circuit, CircuitCurrent, CircuitId, PartDetail, Requirement, Step } from './types'



/** "21 V low-battery cut-off" — shown wherever battery current is worked out. */
function lowBatteryText(ctx: DiagramContext): string {
  return `${fmt(ctx.batteryVolts * LOW_BATTERY_FACTOR, 1)} V low-battery cut-off`
}

function pvCurrent(ctx: DiagramContext): CircuitCurrent {
  const { s, code, pv } = ctx
  const spec = pvCircuit(pv, code)
  return {
    spec,
    currentStep: {
      label: `Highest current the panels can deliver (${code.rules.pvCurrent})`,
      formula: `${pv.strings} string(s) × ${fmt(s.panelIsc ?? 0, 2)} A Isc × ${code.pvCurrentFactor}`,
      result: `${fmt(spec.continuousAmps, 1)} A`,
    },
    requires: [ctx.requires.panelsSized, ctx.requires.iscEntered],
    inputs: ['panelIsc', 'panelsPerString'],
  }
}

function chargeControllerCurrent(ctx: DiagramContext): CircuitCurrent {
  const spec = chargeCircuit(ctx.sized.installedWatts, ctx.batteryVolts, ctx.code)
  return {
    spec,
    currentStep: {
      label: 'Controller output current',
      formula: `${fmt(ctx.sized.installedWatts)} W installed ÷ ${ctx.batteryVolts} V`,
      result: `${fmt(spec.continuousAmps, 1)} A`,
    },
    requires: [ctx.requires.panelsSized],
    inputs: ['systemVoltage'],
  }
}

/**
 * Battery cable. It carries the inverter's draw when discharging, and — on an all-in-one
 * or hybrid inverter that charges through the same cable — the charging current too, so
 * it's sized for whichever is larger.
 */
function batteryCurrent(ctx: DiagramContext): CircuitCurrent {
  const { sized, code, batteryVolts, flags } = ctx
  const discharge = inverterBatteryCircuit(sized.loadInverterWatts, batteryVolts, code)
  const dischargeFormula = `${fmt(sized.loadInverterWatts)} W ÷ (${lowBatteryText(ctx)} × ${INVERTER_EFFICIENCY})`

  if (flags.allInOne || flags.hybrid) {
    const chargeAmps = flags.allInOne
      ? chargeCircuit(sized.installedWatts, batteryVolts, code).continuousAmps + ctx.acChargeAmps
      : ctx.s.batteryChargeAmps ?? 0
    const chargeFormula = flags.allInOne
      ? `${fmt(sized.installedWatts)} W ÷ ${batteryVolts} V solar${flags.acInput ? ` + ${fmt(ctx.acChargeAmps)} A AC charging` : ''}`
      : `${fmt(chargeAmps)} A inverter charge rating`
    const amps = Math.max(discharge.continuousAmps, chargeAmps)
    return {
      spec: { ...discharge, continuousAmps: amps, operatingAmps: amps },
      currentStep: {
        label: 'Largest battery current — discharging or charging',
        formula: `max(${dischargeFormula}, ${chargeFormula})`,
        result: `${fmt(amps, 1)} A`,
      },
      requires: flags.allInOne
        ? [ctx.requires.loadInverterSized]
        : [ctx.requires.loadInverterSized, ctx.requires.hybridChargeCurrentEntered],
      inputs: ['systemVoltage', 'inverterMarginPercent', ...(flags.acInput ? ['acChargeAmps' as const] : []), ...(flags.hybrid && !flags.allInOne ? ['batteryChargeAmps' as const] : [])],
    }
  }

  return {
    spec: discharge,
    currentStep: { label: 'Battery current at full inverter output, battery nearly flat', formula: dischargeFormula, result: `${fmt(discharge.continuousAmps, 1)} A` },
    requires: [ctx.requires.loadInverterSized],
    inputs: ['systemVoltage', 'inverterMarginPercent'],
  }
}

function loadCurrent(ctx: DiagramContext): CircuitCurrent {
  const { s, sized, code } = ctx
  const spec = acCircuit(sized.loadInverterWatts, s.acVoltage, code)
  return {
    spec,
    currentStep: { label: 'Inverter output current', formula: `${fmt(sized.loadInverterWatts)} W ÷ ${s.acVoltage} V`, result: `${fmt(spec.continuousAmps, 1)} A` },
    requires: [ctx.requires.loadInverterSized],
    inputs: ['acVoltage', 'inverterMarginPercent'],
  }
}

/**
 * The grid-side cable. With an all-in-one it's the AC *input* (loads passed straight
 * through plus the battery charger); otherwise it's the inverter's output to the grid.
 */
function gridCurrent(ctx: DiagramContext): CircuitCurrent {
  const { s, sized, code, flags } = ctx
  if (flags.acInput) {
    const chargerWatts = chargerInputWatts(ctx.acChargeAmps, ctx.batteryVolts)
    const spec = acCircuit(sized.loadInverterWatts + chargerWatts, s.acVoltage, code)
    return {
      spec,
      currentStep: {
        label: flags.hybridAllInOne ? 'AC input current — backed-up loads passed through plus the battery charger' : 'AC input current — loads passed through plus the battery charger',
        formula: `(${fmt(sized.loadInverterWatts)} W loads + ${fmt(chargerWatts)} W charger) ÷ ${s.acVoltage} V`,
        result: `${fmt(spec.continuousAmps, 1)} A`,
      },
      requires: [ctx.requires.loadInverterSized],
      inputs: ['acVoltage', 'acChargeAmps', 'inverterMarginPercent'],
    }
  }
  const spec = acCircuit(sized.gridInverterWatts, s.acVoltage, code)
  return {
    spec,
    currentStep: { label: 'Inverter output current', formula: `${fmt(sized.gridInverterWatts)} W ÷ ${s.acVoltage} V`, result: `${fmt(spec.continuousAmps, 1)} A` },
    requires: [ctx.requires.panelsSized],
    inputs: ['acVoltage', 'dcAcRatio'],
  }
}

export function circuitCurrent(ctx: DiagramContext, id: CircuitId): CircuitCurrent {
  switch (id) {
    case 'pv': return pvCurrent(ctx)
    case 'charge': return chargeControllerCurrent(ctx)
    case 'battery': return batteryCurrent(ctx)
    case 'load': return loadCurrent(ctx)
    case 'grid': return gridCurrent(ctx)
  }
}

/** Extra advice on a breaker, specific to the circuit it protects. */
function breakerNotes(ctx: DiagramContext, circuit: Circuit, breakerAmps: number | null): string[] {
  const { s, code, pv, flags } = ctx
  const notes = [
    circuit.dc
      ? 'Must be DC-rated for at least the circuit voltage — an AC-only breaker can fail to clear a DC arc.'
      : 'An AC breaker in the breaker box feeding (or fed by) this circuit, plus a disconnect where your code requires one.',
  ]
  if (breakerAmps === null) notes.push(`Above ${largestBreaker(code)} A: split the load across parallel circuits or raise the system voltage.`)

  switch (circuit.id) {
    case 'pv': {
      const stringFuse = (s.panelIsc ?? 0) * PV_STRING_FUSE_FACTOR
      if (pv.strings < 3) {
        notes.push('With one or two strings, per-string fuses usually aren\'t needed — a faulted string can\'t be back-fed more than the other string\'s current.')
      } else if (flags.necFamily) {
        notes.push(`With ${pv.strings} strings in parallel, each string also needs its own fuse: ≥ ${fmt(stringFuse, 1)} A (Isc × 1.56), so ${nextStandardBreaker(stringFuse, code) ?? `over ${largestBreaker(code)}`} A — and no more than the panel's maximum series fuse rating.`)
      } else {
        notes.push(`With ${pv.strings} strings in parallel, each string also needs its own fuse, rated above the string's maximum current and no more than the panel's maximum series fuse rating (${code.rules.pvCurrent}).`)
      }
      break
    }
    case 'battery':
      notes.push('Put the fuse or breaker as close to the battery\'s positive terminal as practical, with an interrupt rating high enough for the battery\'s short-circuit current (lithium banks often need a class-T or NH fuse).')
      break
    case 'grid':
      notes.push(flags.necFamily && !flags.acInput
        ? 'A back-fed breaker in the main breaker box is limited by its busbar rating (the "120% rule", NEC 705.12) — have an electrician check yours.'
        : 'Your utility\'s connection rules and the breaker box\'s busbar rating may limit this breaker — have an electrician check them.')
      break
    case 'charge':
      notes.push('Many controllers list a maximum battery-side fuse; use the smaller of the two.')
      break
    case 'load':
      break
  }
  return [...notes, ...code.notes]
}

/** The breaker and wire parts for one circuit. */
export function circuitParts(ctx: DiagramContext, circuit: Circuit): [PartDetail, PartDetail] {
  const { s, code, pv } = ctx
  const current = circuitCurrent(ctx, circuit.id)
  const breaker = sizeBreaker(current.spec, code)
  const breakerReady = current.requires.every(r => r.met)

  const breakerSteps: Step[] = [
    current.currentStep,
    {
      label: current.spec.factor > 1 ? `Current to size for (× ${current.spec.factor} safety factor)` : `Current to size for (no extra safety factor under ${code.standard})`,
      formula: `${fmt(current.spec.continuousAmps, 1)} A × ${current.spec.factor}`,
      result: `${fmt(breaker.designAmps, 1)} A`,
    },
    {
      label: `Breaker size — next standard rating up (${code.rules.breaker})`,
      formula: `smallest standard size ≥ ${fmt(breaker.designAmps, 1)} A`,
      result: breaker.breakerAmps === null ? `over ${largestBreaker(code)} A` : `${breaker.breakerAmps} A`,
    },
  ]

  const breakerPart: PartDetail = {
    id: `breaker:${circuit.id}`,
    title: `Breaker — ${circuit.label}`,
    headline: !breakerReady ? NEEDS_INFO : breaker.breakerAmps === null ? `>${largestBreaker(code)} A` : `${breaker.breakerAmps} A`,
    requires: current.requires,
    inputs: [...current.inputs, 'electricalCode'],
    steps: breakerSteps,
    notes: breakerNotes(ctx, circuit, breaker.breakerAmps),
    related: [`wire:${circuit.id}`, circuit.from, circuit.to],
  }

  const length = s[circuit.runKey]
  const drop = s.maxVoltageDropPercent
  const wire = sizeWire(current.spec, length ?? 0, drop, code)
  const wireRequires: Requirement[] = [
    ...current.requires,
    ...(circuit.id === 'pv' ? [ctx.requires.vmpEntered] : []),
    { label: 'Cable length for this run (one way, in metres)', met: length !== null, fields: [circuit.runKey] },
  ]
  const wireReady = wireRequires.every(r => r.met)

  const voltageDropNote = circuit.id === 'pv'
    ? `Voltage drop uses the operating current at maximum power: ${pv.strings} × (${fmt(s.panelWatts)} W ÷ ${fmt(s.panelVmp ?? 0, 1)} V) = ${fmt(current.spec.operatingAmps, 1)} A, at ${fmt(current.spec.volts, 1)} V${pv.even ? '' : ' (the shortest string\'s voltage, the worst case)'}.`
    : `Voltage drop uses the same current, at ${fmt(current.spec.volts, 1)} V, with copper resistance at 75 °C.`

  const wirePart: PartDetail = {
    id: `wire:${circuit.id}`,
    title: `Wire — ${circuit.label}`,
    headline: !wireReady ? NEEDS_INFO : wire.conductor ? wire.conductor.size : `>${largestConductor(code).size}`,
    requires: wireRequires,
    inputs: [...current.inputs, ...(circuit.id === 'pv' ? ['panelVmp' as const] : []), circuit.runKey, 'maxVoltageDropPercent', 'electricalCode'],
    steps: [
      ...breakerSteps,
      {
        label: `Thinnest wire this breaker can protect (${code.rules.conductor})`,
        formula: `copper rated for ≥ ${breaker.breakerAmps ?? `>${largestBreaker(code)}`} A`,
        result: conductorText(wire.byAmpacity, code),
      },
      {
        label: `Thinnest wire that keeps voltage loss within ${drop}%`,
        formula: `2 × ${fmt(length ?? 0, 1)} m × ${fmt(current.spec.operatingAmps, 1)} A × R ÷ ${fmt(current.spec.volts, 1)} V ≤ ${drop}%`,
        result: conductorText(wire.byVoltageDrop, code),
      },
      {
        label: 'Wire size — the thicker of the two',
        formula: wire.conductor ? `voltage drop with ${wire.conductor.size}: ${fmt(wire.dropPercent, 2)}%` : 'beyond the table',
        result: conductorText(wire.conductor, code),
      },
    ],
    notes: [
      voltageDropNote,
      `Ratings assume ${code.ampacityBasis}. Hot roofs, conduit, bundling and higher ambient temperatures all reduce a cable's rating — upsize for those.`,
      ...(wire.conductor === null ? [`Beyond ${largestConductor(code).size}: run parallel conductors, raise the system voltage, or shorten the run.`] : []),
      ...(circuit.dc && circuit.id !== 'pv' ? ['Low-voltage DC cable runs are best kept short — this is where most drop and heat happens.'] : []),
      ...code.notes,
    ],
    related: [`breaker:${circuit.id}`, circuit.from, circuit.to],
  }

  return [breakerPart, wirePart]
}
