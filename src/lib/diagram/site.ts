/** The house side of the drawing: household loads, critical loads, and the grid or generator. */
import { chargerInputWatts } from '../wiring'
import type { DiagramContext } from './types'
import { fmt } from './format'
import type { PartDetail } from './types'

export function loadsPart(ctx: DiagramContext): PartDetail {
  const { s, flags, loads } = ctx
  let notes: string[]
  if (flags.offGrid) {
    notes = ['Everything here runs from the inverter, so this list sizes the inverter, battery and panels.']
  } else if (flags.hybridAllInOne) {
    notes = ['The grid feeds the main breaker box. One breaker here feeds the all-in-one inverter\'s AC input; loads you leave in this box run from the grid only and go dark in an outage.']
  } else {
    notes = ['The main breaker box is fed by the utility grid and the inverter together. The grid carries whatever the solar panels don\'t, so this doesn\'t size the solar equipment — your yearly use does. The main breaker box and service are sized by your electrician and utility.']
    if (flags.hybrid) notes.push('In an outage the inverter disconnects from the grid, and everything here goes dark except what\'s moved to the backup breaker box.')
  }

  return {
    id: 'loads',
    title: flags.offGrid ? 'Household loads' : 'Main breaker box — total max load',
    headline: `${fmt(loads.householdPeakW)} W max load`,
    requires: [],
    inputs: ['appliances', 'acVoltage'],
    steps: [
      { label: 'Daily energy', formula: 'Σ watts × hours × quantity', result: `${fmt(loads.householdWh)} Wh/day` },
      { label: 'Total max load', formula: 'Σ watts × quantity — everything on at once', result: `${fmt(loads.householdPeakW)} W` },
      { label: 'Current at that load', formula: `${fmt(loads.householdPeakW)} W ÷ ${s.acVoltage} V`, result: `${fmt(loads.householdPeakW / s.acVoltage, 1)} A` },
      ...(flags.offGrid ? [] : [{ label: 'Yearly use from this list', formula: `${fmt(loads.householdWh)} Wh × 365 ÷ 1,000`, result: `${fmt((loads.householdWh * 365) / 1000)} kWh/yr` }]),
    ],
    notes,
    related: flags.offGrid ? ['inverter', 'wire:load'] : ['grid', 'inverter', 'wire:grid', ...(flags.hybrid ? ['critical' as const] : [])],
  }
}

/** Hybrid only: the loads kept on in an outage, on the backup breaker box. */
export function criticalPart(ctx: DiagramContext): PartDetail {
  const { s, sized, flags, loads } = ctx
  const peak = loads.batteryLoadsPeakW
  return {
    id: 'critical',
    title: flags.hybridAllInOne ? 'Critical loads (on the all-in-one\'s output)' : 'Critical loads (backup breaker box)',
    headline: `${fmt(peak)} W peak`,
    requires: [],
    inputs: ['criticalAppliances', 'backupDays', 'inverterMarginPercent', 'acVoltage'],
    steps: [
      { label: 'Critical energy', formula: 'Σ watts × hours × quantity', result: `${fmt(loads.criticalWh)} Wh/day` },
      { label: 'Critical peak load', formula: 'Σ watts × quantity', result: `${fmt(peak)} W` },
      { label: 'Backup inverter', formula: `${fmt(peak)} W × ${ctx.inverterMargin}`, result: `${fmt(sized.loadInverterWatts)} W` },
      { label: 'Current at peak', formula: `${fmt(peak)} W ÷ ${s.acVoltage} V`, result: `${fmt(peak / s.acVoltage, 1)} A` },
    ],
    notes: flags.hybridAllInOne
      ? [
          'These circuits move to a backup breaker box fed by the all-in-one\'s output. They run on solar and battery first, take grid power when needed, and stay on in an outage.',
          'With an all-in-one, these loads also set the panel size, since solar can\'t reach anything else.',
        ]
      : ['Only these circuits stay powered in an outage. They usually move to a backup breaker box fed by the inverter\'s backup output.'],
    related: ['battery', 'inverter', 'wire:load', 'breaker:load'],
  }
}

/** Off-grid all-in-one with an AC input: the grid or generator it draws on. */
function acInputSourcePart(ctx: DiagramContext): PartDetail {
  const { s, sized } = ctx
  const chargerWatts = chargerInputWatts(ctx.acChargeAmps, ctx.batteryVolts)
  const total = sized.loadInverterWatts + chargerWatts
  return {
    id: 'grid',
    title: 'Grid / generator (AC input)',
    headline: `${fmt(total)} W max`,
    requires: [],
    inputs: ['acInputSource', 'acChargeAmps', 'acVoltage'],
    steps: [
      { label: 'Loads passed through', formula: 'up to the inverter rating', result: `${fmt(sized.loadInverterWatts)} W` },
      { label: 'Battery charger', formula: `${fmt(s.acChargeAmps)} A charging, at bulk-charge voltage and 85% efficiency`, result: `${fmt(chargerWatts)} W` },
      { label: 'Most the source has to supply', formula: `${fmt(sized.loadInverterWatts)} + ${fmt(chargerWatts)} W`, result: `${fmt(total)} W` },
    ],
    notes: [
      'Size a generator at or above this, with some headroom — or lower the unit\'s AC charging current setting to fit a smaller one.',
      'The unit only draws from this source; it never sends power back to it.',
    ],
    related: ['inverter', 'wire:grid', 'breaker:grid', 'battery'],
  }
}

/** Hybrid all-in-one: the utility grid, which it can draw on but never export to. */
function nonExportingGridPart(ctx: DiagramContext): PartDetail {
  const { s, sized, loads } = ctx
  const criticalKwh = (loads.criticalWh * 365) / 1000
  const fromGrid = Math.max(0, s.annualUsageKwh - sized.usableKwh)
  return {
    id: 'grid',
    title: 'Utility grid',
    headline: `imports ${fmt(fromGrid)} kWh/yr`,
    requires: [],
    inputs: ['annualUsageKwh', 'offsetPercent'],
    steps: [
      { label: 'Estimated production', formula: `${fmt(sized.installedWatts)} W × ${s.peakSunHours} h × ${s.systemDeratePercent / 100} × 365 ÷ 1,000`, result: `${fmt(sized.productionKwh)} kWh/yr` },
      { label: 'Critical loads\' yearly use', formula: `${fmt(loads.criticalWh)} Wh × 365 ÷ 1,000`, result: `${fmt(criticalKwh)} kWh/yr` },
      { label: 'Solar you can use (no export)', formula: `min(${fmt(sized.productionKwh)}, ${fmt(criticalKwh)})`, result: `${fmt(sized.usableKwh)} kWh/yr` },
      { label: 'Bought from the grid', formula: `${fmt(s.annualUsageKwh)} − ${fmt(sized.usableKwh)} kWh`, result: `${fmt(fromGrid)} kWh/yr` },
    ],
    notes: [
      'An all-in-one inverter only draws from the grid — nothing flows back, so there\'s no net-metering credit. Production above what the backed-up loads use is curtailed.',
      'In an outage the unit disconnects from the grid and keeps the backed-up loads running from solar and battery.',
    ],
    related: ['loads', 'inverter', 'critical', 'wire:grid'],
  }
}

/** Grid-tied or grid-interactive hybrid: net yearly import or export. */
function exportingGridPart(ctx: DiagramContext): PartDetail {
  const { s, sized, flags } = ctx
  const net = s.annualUsageKwh - sized.productionKwh
  const roundedNet = Math.round(net)
  const headline = roundedNet > 0 ? `imports ${fmt(net)} kWh/yr` : roundedNet < 0 ? `exports ${fmt(-net)} kWh/yr` : 'balances out over the year'
  return {
    id: 'grid',
    title: 'Utility grid',
    headline,
    requires: [],
    inputs: ['annualUsageKwh', 'offsetPercent'],
    steps: [
      { label: 'Estimated production', formula: `${fmt(sized.installedWatts)} W × ${s.peakSunHours} h × ${s.systemDeratePercent / 100} × 365 ÷ 1,000`, result: `${fmt(sized.productionKwh)} kWh/yr` },
      { label: 'Bought from the grid (net)', formula: `${fmt(s.annualUsageKwh)} − ${fmt(sized.productionKwh)} kWh`, result: `${fmt(net)} kWh/yr` },
      { label: 'Share covered by solar', formula: `${fmt(sized.productionKwh)} ÷ ${fmt(s.annualUsageKwh)}`, result: `${fmt(s.annualUsageKwh > 0 ? (sized.productionKwh / s.annualUsageKwh) * 100 : 0)}%` },
    ],
    notes: [
      'A negative net means surplus exported over the year; whether it\'s credited depends on your utility\'s net-metering rules.',
      flags.hybrid
        ? 'The grid is the main power source: it runs the house alongside the panels and can charge the battery. When it fails, the inverter disconnects so it can\'t back-feed the lines, and the battery takes over the critical loads.'
        : 'Without a battery, the system shuts down during an outage — the inverter must disconnect so it can\'t back-feed the lines.',
    ],
    related: ['loads', 'inverter', 'panels', ...(flags.hybrid ? ['battery' as const] : [])],
  }
}

/** The grid box, if the drawing has one. */
export function gridPart(ctx: DiagramContext): PartDetail | null {
  if (ctx.flags.offGrid) return ctx.flags.acInput ? acInputSourcePart(ctx) : null
  return ctx.flags.hybridAllInOne ? nonExportingGridPart(ctx) : exportingGridPart(ctx)
}
