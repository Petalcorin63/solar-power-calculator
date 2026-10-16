/**
 * Everything the part builders share, computed once per `describeSystem` call: the sized
 * equipment (normalized across system types), the PV string layout, which drawing is in
 * use, and the prerequisites several parts depend on.
 */
import { gridTiedInputs, hybridInputs, offGridInputs, type ProjectState } from '../project'
import {
  calculateGridTied,
  calculateHybrid,
  calculateOffGrid,
  dailyLoadWh,
  peakLoadW,
  type Appliance,
  type BatteryLayout,
} from '../sizing'
import { ELECTRICAL_CODES, pvLayout } from '../wiring'
import { hasAcInput, isAllInOne, layoutFor } from './topology'
import type { DiagramContext, Requirement, Sized } from './types'



const NO_BATTERIES: BatteryLayout = { series: 0, parallel: 0, total: 0 }

function size(s: ProjectState): Sized {
  switch (s.systemType) {
    case 'off-grid': {
      const r = calculateOffGrid(offGridInputs(s))
      return {
        arrayWattsNeeded: r.arrayWattsNeeded,
        panelCount: r.panelCount,
        installedWatts: r.installedArrayWatts,
        bankWh: r.batteryBankWh,
        bankAh: r.batteryBankAh,
        batteries: r.batteries,
        loadInverterWatts: r.inverterWatts,
        gridInverterWatts: 0,
        productionKwh: 0,
        usableKwh: 0,
      }
    }
    case 'grid-tied': {
      const r = calculateGridTied(gridTiedInputs(s))
      return {
        arrayWattsNeeded: r.arrayWattsNeeded,
        panelCount: r.panelCount,
        installedWatts: r.installedArrayWatts,
        bankWh: 0,
        bankAh: 0,
        batteries: NO_BATTERIES,
        loadInverterWatts: 0,
        gridInverterWatts: r.inverterWatts,
        productionKwh: r.estimatedAnnualProductionKwh,
        usableKwh: r.estimatedAnnualProductionKwh,
      }
    }
    case 'hybrid': {
      const r = calculateHybrid(hybridInputs(s))
      return {
        arrayWattsNeeded: r.arrayWattsNeeded,
        panelCount: r.panelCount,
        installedWatts: r.installedArrayWatts,
        bankWh: r.batteryBankWh,
        bankAh: r.batteryBankAh,
        batteries: r.batteries,
        loadInverterWatts: r.backupInverterWatts,
        gridInverterWatts: r.gridTieInverterWatts,
        productionKwh: r.estimatedAnnualProductionKwh,
        usableKwh: r.usableProductionKwh,
      }
    }
  }
}

function loadsFor(appliances: Appliance[]) {
  return { wh: dailyLoadWh(appliances), peakW: peakLoadW(appliances) }
}

export function buildContext(s: ProjectState): DiagramContext {
  const sized = size(s)
  const layout = layoutFor(s)
  const offGrid = s.systemType === 'off-grid'
  const hybrid = s.systemType === 'hybrid'
  const acInput = hasAcInput(layout)
  const household = loadsFor(s.appliances)
  const critical = loadsFor(s.criticalAppliances)
  const battery = hybrid ? critical : household

  const panelsSized: Requirement = offGrid
    ? { label: 'Panels sized — list the loads the system powers', met: sized.panelCount > 0, part: 'loads' }
    : layout === 'hybrid-aio'
      ? { label: 'Panels sized — list the critical loads on the inverter\'s output', met: sized.panelCount > 0, part: 'critical' }
      : { label: 'Panels sized — enter your yearly electricity use', met: sized.panelCount > 0, fields: ['annualUsageKwh'] }

  return {
    s,
    code: ELECTRICAL_CODES[s.electricalCode],
    layout,
    sized,
    pv: pvLayout(sized.panelCount, s.panelsPerString, s.panelWatts, s.panelVmp ?? 0, s.panelVoc ?? 0, s.panelIsc ?? 0),
    batteryVolts: s.systemVoltage,
    flags: {
      offGrid,
      gridTied: s.systemType === 'grid-tied',
      hybrid,
      allInOne: isAllInOne(layout),
      acInput,
      hybridAllInOne: layout === 'hybrid-aio',
      necFamily: s.electricalCode === 'nec' || s.electricalCode === 'pec',
    },
    acChargeAmps: acInput ? s.acChargeAmps : 0,
    loads: {
      householdWh: household.wh,
      householdPeakW: household.peakW,
      criticalWh: critical.wh,
      batteryLoadsWh: battery.wh,
      batteryLoadsPeakW: battery.peakW,
    },
    inverterMargin: 1 + s.inverterMarginPercent / 100,
    requires: {
      panelsSized,
      iscEntered: { label: 'Panel short-circuit current (Isc) from its datasheet', met: s.panelIsc !== null, fields: ['panelIsc'] },
      vmpEntered: { label: 'Panel max-power voltage (Vmp) from its datasheet', met: s.panelVmp !== null, fields: ['panelVmp'] },
      loadInverterSized: hybrid
        ? { label: 'Backup inverter sized — list your critical loads', met: sized.loadInverterWatts > 0, part: 'critical' }
        : { label: 'Inverter sized — list the loads the system powers', met: sized.loadInverterWatts > 0, part: 'loads' },
      hybridChargeCurrentEntered: {
        label: 'Hybrid inverter\'s maximum battery charge current, from its datasheet',
        met: s.batteryChargeAmps !== null,
        fields: ['batteryChargeAmps'],
      },
    },
  }
}
