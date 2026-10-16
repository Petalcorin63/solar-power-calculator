/** Equipment parts: solar panels, charge controller, battery bank and inverter. */
import { CONTROLLER_SAFETY_MARGIN, DEPTH_OF_DISCHARGE } from '../sizing'
import { CHARGE_VOLTAGE_FACTOR, INVERTER_EFFICIENCY, chargerInputWatts, coldVoc } from '../wiring'
import { NEEDS_INFO } from './constants'
import { batteryText, fmt, plural } from './format'
import type { DiagramContext, FieldKey, PartDetail, Step } from './types'

const PANEL_DATASHEET_FIELDS: FieldKey[] = ['panelsPerString', 'panelVoc', 'panelVmp', 'panelIsc', 'vocTempCoeffPercent', 'lowestTempC']

/** Built-in or separate MPPT rating the panels need: installed watts ÷ battery volts × 1.25. */
function mpptAmps(ctx: DiagramContext): number {
  return ctx.sized.installedWatts > 0 ? (ctx.sized.installedWatts / ctx.batteryVolts) * CONTROLLER_SAFETY_MARGIN : 0
}

/**
 * The string voltage a controller or inverter must withstand: the coldest-morning Voc
 * when the site's lowest temperature is known, otherwise the 25 °C value with a warning.
 */
function stringVoltageCheck(ctx: DiagramContext, against: string): Step | null {
  const { s, pv } = ctx
  if (pv.series === 0 || s.panelVoc === null) return null
  if (s.lowestTempC === null) {
    return { label: `Panel voltage to check against ${against} (25 °C — enter your coldest temperature for the real maximum)`, formula: `${pv.series} × ${fmt(s.panelVoc, 1)} V Voc`, result: `${fmt(pv.stringVoc, 1)} V` }
  }
  const panelCold = coldVoc(s.panelVoc, s.vocTempCoeffPercent, s.lowestTempC)
  return {
    label: `Highest panel voltage, on the coldest morning — check against ${against}`,
    formula: `${pv.series} × ${fmt(s.panelVoc, 1)} V × (1 + ${s.vocTempCoeffPercent}% × (${s.lowestTempC} − 25) °C)`,
    result: `${fmt(pv.series * panelCold, 1)} V`,
  }
}

export function panelsPart(ctx: DiagramContext): PartDetail {
  const { s, sized, pv, flags, loads } = ctx
  const derate = s.systemDeratePercent / 100
  const steps: Step[] = []

  if (flags.hybridAllInOne) {
    steps.push(
      { label: 'Critical loads\' daily use', formula: 'Σ watts × hours × quantity', result: `${fmt(loads.criticalWh)} Wh/day` },
      { label: 'Panel power needed (no export, so sized to these loads)', formula: `${fmt(loads.criticalWh)} Wh × ${s.offsetPercent}% ÷ (${s.peakSunHours} h × ${derate} derate)`, result: `${fmt(sized.arrayWattsNeeded)} W` },
    )
  } else if (flags.offGrid) {
    steps.push(
      { label: 'Daily load', formula: 'Σ watts × hours × quantity', result: `${fmt(loads.householdWh)} Wh/day` },
      { label: 'Panel power needed', formula: `${fmt(loads.householdWh)} Wh ÷ (${s.peakSunHours} h × ${derate} derate)`, result: `${fmt(sized.arrayWattsNeeded)} W` },
    )
  } else {
    steps.push({ label: 'Panel power needed', formula: `${fmt(s.annualUsageKwh)} kWh × 1,000 × ${s.offsetPercent}% ÷ (${s.peakSunHours} h × 365 × ${derate} derate)`, result: `${fmt(sized.arrayWattsNeeded)} W` })
  }
  steps.push(
    { label: 'Number of panels', formula: `⌈${fmt(sized.arrayWattsNeeded)} W ÷ ${fmt(s.panelWatts)} W⌉`, result: plural(sized.panelCount, 'panel') },
    { label: 'Installed panel power', formula: `${sized.panelCount} × ${fmt(s.panelWatts)} W`, result: `${fmt(sized.installedWatts)} W` },
  )
  if (!flags.offGrid) {
    steps.push({ label: 'Estimated yearly production', formula: `${fmt(sized.installedWatts)} W × ${s.peakSunHours} h × ${derate} × 365 ÷ 1,000`, result: `${fmt(sized.productionKwh)} kWh/yr` })
  }

  const notes: string[] = []
  if (pv.series > 0) {
    steps.push({ label: 'Wiring layout (strings)', formula: `${pv.series} in series per string × ⌈${sized.panelCount} ÷ ${pv.series}⌉ strings`, result: `${pv.series} × ${plural(pv.strings, 'string')}` })
    if (s.panelVmp !== null) steps.push({ label: 'String voltage when producing (Vmp)', formula: `${pv.series} × ${fmt(s.panelVmp, 1)} V`, result: `${fmt(pv.stringVmp, 1)} V` })
    const voltageCheck = stringVoltageCheck(ctx, flags.offGrid && !flags.allInOne ? 'the charge controller' : 'the inverter')
    if (voltageCheck) steps.push(voltageCheck)
    if (s.panelIsc !== null) steps.push({ label: 'Short-circuit current of all strings (Isc)', formula: `${pv.strings} × ${fmt(s.panelIsc, 2)} A`, result: `${fmt(pv.arrayIsc, 2)} A` })
    if (!pv.even) notes.push(`${sized.panelCount} panels don't divide evenly into strings of ${pv.series} — the last string has ${pv.shortestSeries}, and unequal strings in parallel lose power. Adjust panels per string or add panels.`)
    notes.push('Voltage rises in the cold (NEC 690.7; AS/NZS 5033). Keep the coldest-morning string voltage below the controller or inverter\'s maximum PV input voltage.')
  }

  const usageFields: FieldKey[] = flags.offGrid ? [] : flags.hybridAllInOne ? ['offsetPercent'] : ['annualUsageKwh', 'offsetPercent']
  return {
    id: 'panels',
    title: 'Solar panels',
    headline: sized.panelCount > 0 ? `${sized.panelCount} × ${fmt(s.panelWatts)} W` : NEEDS_INFO,
    requires: [ctx.requires.panelsSized],
    inputs: [...usageFields, 'panelWatts', 'peakSunHours', 'systemDeratePercent', ...PANEL_DATASHEET_FIELDS],
    steps,
    notes,
    related: ['wire:pv', 'breaker:pv', flags.offGrid && !flags.allInOne ? 'controller' : 'inverter'],
  }
}

/** Separate MPPT charge controller — off-grid with separate equipment only. */
export function controllerPart(ctx: DiagramContext): PartDetail {
  const amps = mpptAmps(ctx)
  const voltageCheck = stringVoltageCheck(ctx, 'the controller')
  return {
    id: 'controller',
    title: 'Charge controller (MPPT)',
    headline: amps > 0 ? `${fmt(amps)} A` : NEEDS_INFO,
    requires: [ctx.requires.panelsSized],
    inputs: ['systemVoltage', 'offGridSetup', 'lowestTempC'],
    steps: [
      { label: 'Controller rating', formula: `${fmt(ctx.sized.installedWatts)} W ÷ ${ctx.batteryVolts} V × ${CONTROLLER_SAFETY_MARGIN}`, result: `${fmt(amps, 1)} A minimum` },
      ...(voltageCheck ? [voltageCheck] : []),
    ],
    notes: [
      'Round up to the next controller size you can buy, and check its maximum PV input voltage and current against the panels.',
      'Using an all-in-one inverter with a built-in charge controller (PowMr, MPP Solar and similar)? Switch "Equipment setup" to all-in-one and this box goes away.',
    ],
    related: ['panels', 'wire:pv', 'wire:charge', 'battery'],
  }
}

export function batteryPart(ctx: DiagramContext): PartDetail {
  const { s, sized, flags, loads, batteryVolts } = ctx
  const days = flags.hybrid ? s.backupDays : s.daysOfAutonomy
  const dod = DEPTH_OF_DISCHARGE[s.batteryChemistry]
  return {
    id: 'battery',
    title: flags.hybrid ? 'Backup battery bank' : 'Battery bank',
    headline: sized.batteries.total > 0 ? `${sized.batteries.total} × ${fmt(s.batteryAh)}Ah ${s.batteryVoltage}V` : NEEDS_INFO,
    requires: [flags.hybrid
      ? { label: 'Critical loads listed', met: loads.batteryLoadsWh > 0, part: 'critical' }
      : { label: 'Loads listed', met: loads.batteryLoadsWh > 0, part: 'loads' }],
    inputs: ['systemVoltage', 'batteryChemistry', 'batteryAh', 'batteryVoltage', flags.hybrid ? 'backupDays' : 'daysOfAutonomy'],
    steps: [
      { label: flags.hybrid ? 'Critical load' : 'Daily load', formula: 'Σ watts × hours × quantity', result: `${fmt(loads.batteryLoadsWh)} Wh/day` },
      { label: 'Battery energy needed', formula: `${fmt(loads.batteryLoadsWh)} Wh × ${days} day(s) ÷ ${dod} DoD`, result: `${fmt(sized.bankWh)} Wh` },
      { label: 'Battery capacity needed', formula: `${fmt(sized.bankWh)} Wh ÷ ${batteryVolts} V`, result: `${fmt(sized.bankAh, 1)} Ah` },
      {
        label: 'Batteries to buy',
        formula: `(${batteryVolts} V ÷ ${s.batteryVoltage} V) in series × ⌈${fmt(sized.bankAh, 1)} Ah ÷ ${fmt(s.batteryAh)} Ah⌉ strings`,
        result: batteryText(sized.batteries, s.batteryAh, s.batteryVoltage),
      },
    ],
    notes: sized.batteries.parallel > 2
      ? ['Many manufacturers limit how many strings can run in parallel — check yours, or use larger-capacity units.']
      : [],
    related: ['wire:battery', 'breaker:battery', 'inverter', ...(flags.offGrid && !flags.allInOne ? ['controller' as const] : [])],
  }
}

/** Peak load and the inverter rating it implies — the first two steps of every battery inverter. */
function inverterRatingSteps(ctx: DiagramContext, peakLabel: string): Step[] {
  const peak = ctx.loads.batteryLoadsPeakW
  return [
    { label: peakLabel, formula: 'Σ watts × quantity', result: `${fmt(peak)} W` },
    { label: 'Inverter rating', formula: `${fmt(peak)} W × ${ctx.inverterMargin}`, result: `${fmt(ctx.sized.loadInverterWatts)} W continuous` },
  ]
}

const SURGE_NOTE = 'Check the surge rating separately against the starting surge of motor loads (fridges, pumps).'

function allInOneInverterPart(ctx: DiagramContext): PartDetail {
  const { sized, flags } = ctx
  const chargerWatts = chargerInputWatts(ctx.acChargeAmps, ctx.batteryVolts)
  const voltageCheck = stringVoltageCheck(ctx, 'the unit\'s PV input')

  let setupNotes: string[]
  if (flags.hybridAllInOne) {
    setupNotes = [
      'The grid feeds the unit\'s AC input from the main breaker box. Its output feeds the backup breaker box, so those loads run on solar and battery first and the grid tops up — in what order is set by the unit\'s output priority setting (often called "solar first" / SBU or "utility first").',
      'It can\'t export: solar only serves the loads on its output and charges the battery. That\'s why the panels are sized to the critical loads, not your whole bill — extra panels would mostly go unused.',
      'Never connect the AC output to the grid or the main breaker box, and check whether your utility allows it to be connected at all.',
    ]
  } else if (flags.acInput) {
    setupNotes = [
      'With grid or generator power on the AC input, most units pass it straight through to the loads ("line" or "bypass" mode) and charge the battery at the same time. Total charging (solar + AC) is usually capped by a setting — check it doesn\'t exceed what your battery accepts.',
      'These are off-grid inverters: they can use grid power but not send power back to it. Never connect the AC output to the grid or another AC source.',
    ]
  } else {
    setupNotes = ['Many of these units also have an AC input for a grid or generator to charge the battery — set "AC input" to add it to the drawing.']
  }

  return {
    id: 'inverter',
    title: 'All-in-one inverter (inverter + MPPT charger + AC charger)',
    headline: sized.loadInverterWatts > 0 ? `${fmt(sized.loadInverterWatts)} W` : NEEDS_INFO,
    requires: [ctx.requires.loadInverterSized],
    inputs: flags.hybridAllInOne
      ? ['hybridSetup', 'acChargeAmps', 'inverterMarginPercent', 'acVoltage', 'lowestTempC']
      : ['offGridSetup', 'acInputSource', ...(flags.acInput ? ['acChargeAmps' as const] : []), 'inverterMarginPercent', 'acVoltage', 'lowestTempC'],
    steps: [
      ...inverterRatingSteps(ctx, flags.hybridAllInOne ? 'Critical loads at peak (all on at once)' : 'Peak load (all on at once)'),
      { label: 'Built-in MPPT: solar charging current needed', formula: `${fmt(sized.installedWatts)} W ÷ ${ctx.batteryVolts} V × ${CONTROLLER_SAFETY_MARGIN}`, result: `${fmt(mpptAmps(ctx), 1)} A minimum` },
      ...(voltageCheck ? [voltageCheck] : []),
      ...(flags.acInput
        ? [{ label: flags.hybridAllInOne ? 'AC charger power drawn from the grid' : 'AC charger power drawn from the grid/generator', formula: `${fmt(ctx.acChargeAmps)} A × ${ctx.batteryVolts} V × ${CHARGE_VOLTAGE_FACTOR} while bulk charging ÷ ${INVERTER_EFFICIENCY}`, result: `${fmt(chargerWatts)} W` }]
        : []),
    ],
    notes: [
      'One box does three jobs: inverter, MPPT solar charge controller and (with an AC input) a battery charger — so there\'s no separate controller or controller-to-battery cable.',
      'Check the unit\'s datasheet for its maximum solar charging current, maximum PV input voltage and MPPT voltage range. These limits vary widely by model.',
      ...setupNotes,
      SURGE_NOTE,
    ],
    related: flags.hybridAllInOne
      ? ['panels', 'battery', 'critical', 'loads', 'wire:battery', 'wire:grid']
      : ['panels', 'battery', 'loads', 'wire:battery', ...(flags.acInput ? ['grid' as const, 'wire:grid' as const] : [])],
  }
}

function offGridInverterPart(ctx: DiagramContext): PartDetail {
  const { s, sized } = ctx
  return {
    id: 'inverter',
    title: 'Inverter',
    headline: sized.loadInverterWatts > 0 ? `${fmt(sized.loadInverterWatts)} W` : NEEDS_INFO,
    requires: [ctx.requires.loadInverterSized],
    inputs: ['offGridSetup', 'inverterMarginPercent', 'acVoltage'],
    steps: [
      ...inverterRatingSteps(ctx, 'Peak load (all on at once)'),
      { label: 'AC output current', formula: `${fmt(sized.loadInverterWatts)} W ÷ ${s.acVoltage} V`, result: `${fmt(sized.loadInverterWatts / s.acVoltage, 1)} A` },
    ],
    notes: [
      SURGE_NOTE,
      'If your inverter has the charge controller built in (an "all-in-one" inverter-charger like PowMr or MPP Solar units), switch "Equipment setup" to all-in-one.',
    ],
    related: ['loads', 'wire:battery', 'wire:load', 'battery'],
  }
}

function gridTieInverterPart(ctx: DiagramContext): PartDetail {
  const { s, sized } = ctx
  return {
    id: 'inverter',
    title: 'Grid-tie inverter',
    headline: sized.gridInverterWatts > 0 ? `${fmt(sized.gridInverterWatts)} W` : NEEDS_INFO,
    requires: [ctx.requires.panelsSized],
    inputs: ['dcAcRatio', 'acVoltage', 'lowestTempC'],
    steps: [
      { label: 'Inverter rating', formula: `${fmt(sized.installedWatts)} W DC ÷ ${s.dcAcRatio} DC:AC`, result: `${fmt(sized.gridInverterWatts)} W AC` },
      { label: 'AC output current', formula: `${fmt(sized.gridInverterWatts)} W ÷ ${s.acVoltage} V`, result: `${fmt(sized.gridInverterWatts / s.acVoltage, 1)} A` },
    ],
    notes: ['Check the inverter\'s MPPT input voltage window and maximum input current against the string layout on the panels.'],
    related: ['panels', 'wire:pv', 'wire:grid', 'loads'],
  }
}

function hybridInverterPart(ctx: DiagramContext): PartDetail {
  const { s, sized } = ctx
  const rating = Math.max(sized.gridInverterWatts, sized.loadInverterWatts)
  return {
    id: 'inverter',
    title: 'Hybrid inverter',
    headline: rating > 0 ? `${fmt(rating)} W` : NEEDS_INFO,
    requires: [ctx.requires.panelsSized],
    inputs: ['hybridSetup', 'dcAcRatio', 'inverterMarginPercent', 'batteryChargeAmps', 'acVoltage'],
    steps: [
      { label: 'Solar-side rating (from the panels)', formula: `${fmt(sized.installedWatts)} W DC ÷ ${s.dcAcRatio} DC:AC`, result: `${fmt(sized.gridInverterWatts)} W AC` },
      { label: 'Backup-side rating (from critical loads)', formula: `${fmt(ctx.loads.batteryLoadsPeakW)} W peak × ${ctx.inverterMargin}`, result: `${fmt(sized.loadInverterWatts)} W` },
      { label: 'Hybrid inverter — must meet both', formula: `max(${fmt(sized.gridInverterWatts)}, ${fmt(sized.loadInverterWatts)})`, result: `${fmt(rating)} W` },
    ],
    notes: [
      'Battery charging runs through this inverter, so the battery cable is sized for its maximum charge current as well as its draw — enter that from the datasheet. Check it against the battery\'s recommended charge rate too.',
      'Check that the unit is really grid-interactive (listed for connection to the grid, e.g. UL 1741 in the US). Many units sold as "hybrid" — PowMr, MPP Solar and similar all-in-ones — are off-grid inverter-chargers: they draw on the grid to charge the battery but can\'t export to it or run in parallel with it. For one of those, switch "Equipment setup" to all-in-one.',
    ],
    related: ['panels', 'battery', 'critical', 'loads', 'wire:battery'],
  }
}

export function inverterPart(ctx: DiagramContext): PartDetail {
  if (ctx.flags.allInOne) return allInOneInverterPart(ctx)
  if (ctx.flags.offGrid) return offGridInverterPart(ctx)
  if (ctx.flags.gridTied) return gridTieInverterPart(ctx)
  return hybridInverterPart(ctx)
}
