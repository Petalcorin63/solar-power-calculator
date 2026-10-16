import { describe, expect, it } from 'vitest'
import {
  arrayWattsForFullLoad,
  arrayWattsForOffset,
  batteryLayout,
  calculateGridTied,
  calculateHybrid,
  calculateOffGrid,
  dailyLoadWh,
  peakLoadW,
  type Appliance,
  type GridTiedInputs,
  type OffGridInputs,
} from '.'

const appliances: Appliance[] = [
  { id: 1, name: 'LED lights', watts: 10, hours: 5, quantity: 4 },
  { id: 2, name: 'Refrigerator', watts: 150, hours: 8, quantity: 1 },
  { id: 3, name: 'Laptop', watts: 65, hours: 4, quantity: 1 },
]

const offGrid: OffGridInputs = {
  appliances,
  peakSunHours: 4.5,
  systemDerate: 0.75,
  systemVoltage: 24,
  daysOfAutonomy: 2,
  batteryChemistry: 'lithium',
  panelWatts: 400,
  batteryAh: 100,
  batteryVoltage: 12,
  inverterSafetyMargin: 1.25,
  controllerSafetyMargin: 1.25,
}

const gridTied: GridTiedInputs = {
  annualUsageKwh: 10_000,
  offsetPercent: 100,
  peakSunHours: 4.5,
  systemDerate: 0.75,
  panelWatts: 400,
  dcAcRatio: 1.2,
}

describe('loads', () => {
  it('sums daily energy and peak draw', () => {
    expect(dailyLoadWh(appliances)).toBe(1660)
    expect(peakLoadW(appliances)).toBe(255)
  })

  it('ignores blank, NaN and negative appliance values', () => {
    const bad = [
      { id: 1, name: 'blank', watts: '' as unknown as number, hours: 5, quantity: 1 },
      { id: 2, name: 'nan', watts: NaN, hours: 5, quantity: 1 },
      { id: 3, name: 'negative', watts: -100, hours: 5, quantity: 1 },
      { id: 4, name: 'ok', watts: 100, hours: 2, quantity: 1 },
    ]
    expect(dailyLoadWh(bad)).toBe(200)
    expect(peakLoadW(bad)).toBe(100)
  })
})

describe('array sizing', () => {
  it('returns 0 rather than Infinity for zero or blank sun hours / derate', () => {
    expect(arrayWattsForFullLoad(1660, 0, 0.75)).toBe(0)
    expect(arrayWattsForFullLoad(1660, 4.5, 0)).toBe(0)
    expect(arrayWattsForFullLoad(1660, '' as unknown as number, 0.75)).toBe(0)
    expect(arrayWattsForOffset(10_000, 100, 0, 0.75)).toBe(0)
  })
})

describe('batteryLayout', () => {
  it('wires lower-voltage units in series to reach system voltage', () => {
    // 163 Ah at 24 V from 12 V 100 Ah units: 2 in series × 2 strings
    expect(batteryLayout(162.7, 100, 24, 12)).toEqual({ series: 2, parallel: 2, total: 4 })
    expect(batteryLayout(162.7, 100, 48, 12)).toEqual({ series: 4, parallel: 2, total: 8 })
  })

  it('needs no series wiring when unit voltage matches the system', () => {
    expect(batteryLayout(162.7, 100, 24, 24)).toEqual({ series: 1, parallel: 2, total: 2 })
  })

  it('returns no batteries for an empty bank or impossible units', () => {
    const none = { series: 0, parallel: 0, total: 0 }
    expect(batteryLayout(0, 100, 24, 12)).toEqual(none)
    expect(batteryLayout(162.7, 0, 24, 12)).toEqual(none)
    expect(batteryLayout(162.7, 100, 12, 24)).toEqual(none)
  })
})

describe('calculateOffGrid', () => {
  const r = calculateOffGrid(offGrid)

  it('sizes the array and rounds up to whole panels', () => {
    expect(r.arrayWattsNeeded).toBeCloseTo(491.85, 1)
    expect(r.panelCount).toBe(2)
    expect(r.installedArrayWatts).toBe(800)
  })

  it('sizes the charge controller to the installed array, not the minimum', () => {
    expect(r.chargeControllerAmps).toBeCloseTo((800 / 24) * 1.25)
  })

  it('sizes the battery bank and counts series/parallel units', () => {
    // 1,660 Wh × 2 days ÷ 0.80 DoD = 4,150 Wh → ÷ 24 V = 172.9 Ah
    // → 2 × 12 V in series × ⌈172.9 ÷ 100⌉ = 2 strings = 4 batteries
    expect(r.batteryBankWh).toBeCloseTo(4150)
    expect(r.batteryBankAh).toBeCloseTo(4150 / 24)
    expect(r.batteries).toEqual({ series: 2, parallel: 2, total: 4 })
  })

  it('sizes the inverter to peak load with margin', () => {
    expect(r.inverterWatts).toBeCloseTo(255 * 1.25)
  })

  it('stays finite with zero sun hours', () => {
    const z = calculateOffGrid({ ...offGrid, peakSunHours: 0 })
    for (const v of [z.arrayWattsNeeded, z.panelCount, z.installedArrayWatts, z.chargeControllerAmps]) {
      expect(v).toBe(0)
    }
  })
})

describe('calculateGridTied', () => {
  const r = calculateGridTied(gridTied)

  it('sizes inverter and production from the installed array', () => {
    // 10,000 kWh ÷ (4.5 × 365 × 0.75) = 8,117 W → 21 × 400 W = 8,400 W
    expect(r.panelCount).toBe(21)
    expect(r.installedArrayWatts).toBe(8400)
    expect(r.inverterWatts).toBeCloseTo(8400 / 1.2)
    expect(r.estimatedAnnualProductionKwh).toBeCloseTo((8400 * 4.5 * 0.75 * 365) / 1000)
  })

  it('estimates production at or above the target, not just echoing it', () => {
    expect(r.estimatedAnnualProductionKwh).toBeGreaterThan(10_000)
  })
})

describe('calculateHybrid', () => {
  const r = calculateHybrid({
    ...gridTied,
    criticalAppliances: appliances,
    backupDays: 1,
    systemVoltage: 48,
    batteryChemistry: 'agm',
    batteryAh: 100,
    batteryVoltage: 12,
    inverterSafetyMargin: 1.25,
  })

  it('sizes grid-side equipment from the installed array', () => {
    expect(r.installedArrayWatts).toBe(8400)
    expect(r.gridTieInverterWatts).toBeCloseTo(8400 / 1.2)
  })

  it('does not size a charge controller for the whole offset array', () => {
    // 8,400 W ÷ 48 V × 1.25 would be 219 A — not a real hybrid component.
    expect(r).not.toHaveProperty('chargeControllerAmps')
  })

  it('sizes the backup battery to critical loads only', () => {
    // 1,660 Wh ÷ 0.5 DoD = 3,320 Wh → 69.2 Ah at 48 V → 4 × 12 V in series, 1 string
    expect(r.batteryBankWh).toBeCloseTo(3320)
    expect(r.batteries).toEqual({ series: 4, parallel: 1, total: 4 })
    expect(r.backupInverterWatts).toBeCloseTo(255 * 1.25)
  })
})

describe('calculateHybrid with an all-in-one inverter (no export)', () => {
  const base = {
    ...gridTied,
    criticalAppliances: appliances,
    backupDays: 1,
    systemVoltage: 48 as const,
    batteryChemistry: 'agm' as const,
    batteryAh: 100,
    batteryVoltage: 12 as const,
    inverterSafetyMargin: 1.25,
  }
  const r = calculateHybrid({ ...base, setup: 'all-in-one' })

  it('sizes the array to the critical loads, not the whole bill', () => {
    // 1,660 Wh × 100% ÷ (4.5 h × 0.75) = 491.9 W → 2 × 400 W = 800 W (vs 8,400 W when exporting)
    expect(r.arrayWattsNeeded).toBeCloseTo(491.85, 1)
    expect(r.installedArrayWatts).toBe(800)
    expect(calculateHybrid(base).installedArrayWatts).toBe(8400)
  })

  it('sizes the built-in solar charger instead of a grid-tie rating', () => {
    // 800 W ÷ 48 V × 1.25 = 20.8 A
    expect(r.solarChargerAmps).toBeCloseTo(20.83, 2)
    expect(r.gridTieInverterWatts).toBe(0)
    expect(calculateHybrid(base).solarChargerAmps).toBeNull()
  })

  it('counts only the solar the critical loads can use', () => {
    // Production 800 × 4.5 × 0.75 × 365 ÷ 1,000 = 985.5 kWh; critical use 1,660 × 365 ÷ 1,000 = 605.9 kWh
    expect(r.estimatedAnnualProductionKwh).toBeCloseTo(985.5, 1)
    expect(r.usableProductionKwh).toBeCloseTo(605.9, 1)
  })

  it('sizes the battery and inverter the same as any hybrid', () => {
    expect(r.batteryBankWh).toBeCloseTo(3320)
    expect(r.backupInverterWatts).toBeCloseTo(255 * 1.25)
  })
})
