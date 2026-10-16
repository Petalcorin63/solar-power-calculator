/** The inputs a new visitor starts with — also the fallback for anything missing from a save. */
import { DAYS_PER_YEAR, WH_PER_KWH, dailyLoadWh, type Appliance } from '../sizing'
import type { ProjectState } from './types'

export function defaultProjectState(): ProjectState {
  const appliances: Appliance[] = [
    { id: 1, name: 'LED lights', watts: 10, hours: 5, quantity: 4 },
    { id: 2, name: 'Refrigerator', watts: 150, hours: 8, quantity: 1 },
    { id: 3, name: 'Laptop', watts: 65, hours: 4, quantity: 1 },
  ]
  return {
    version: 1,
    systemType: 'off-grid',
    appliances,
    criticalAppliances: [
      { id: 1, name: 'Refrigerator', watts: 150, hours: 8, quantity: 1 },
      { id: 2, name: 'LED lights', watts: 10, hours: 4, quantity: 3 },
      { id: 3, name: 'Wifi router', watts: 10, hours: 24, quantity: 1 },
    ],
    peakSunHours: 4.5,
    systemDeratePercent: 75,
    panelWatts: 400,
    systemVoltage: 24,
    batteryChemistry: 'lithium',
    batteryAh: 100,
    batteryVoltage: 12,
    inverterMarginPercent: 25,
    daysOfAutonomy: 2,
    annualUsageKwh: Math.round((dailyLoadWh(appliances) * DAYS_PER_YEAR) / WH_PER_KWH),
    offsetPercent: 100,
    dcAcRatio: 1.2,
    backupDays: 1,
    electricalCode: 'nec',
    offGridSetup: 'separate',
    hybridSetup: 'grid-interactive',
    acInputSource: 'none',
    // A common default for these units' utility charger (MPP Solar PIP: 30 A default, 60 A max).
    acChargeAmps: 30,
    panelVoc: null,
    panelVmp: null,
    panelIsc: null,
    // The Clean Energy Council's worked example uses −0.27 %/°C, typical of crystalline panels.
    vocTempCoeffPercent: -0.27,
    lowestTempC: null,
    batteryChargeAmps: null,
    panelsPerString: 10,
    acVoltage: 240,
    maxVoltageDropPercent: 3,
    pvRunM: null,
    chargeRunM: null,
    batteryRunM: null,
    loadRunM: null,
    gridRunM: null,
  }
}
