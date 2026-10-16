import { describe, expect, it } from 'vitest'
import {
  CODE_IDS,
  ELECTRICAL_CODES,
  chargerInputWatts,
  coldVoc,
  conductorForBreaker,
  inverterBatteryCircuit,
  nextStandardBreaker,
  pvCircuit,
  pvLayout,
  sizeBreaker,
  sizeWire,
  voltageDropPercent,
} from '.'

const { nec, pec, iec, asnzs } = ELECTRICAL_CODES
const size = (code: typeof nec, name: string) => code.conductors.find(c => c.size === name)!

/** Default panel from the app's hints: 400 W, Vmp 31 V, Voc 37 V, Isc 13.9 A; 2 panels in one string. */
const twoPanels = pvLayout(2, 10, 400, 31, 37, 13.9)

describe('tables', () => {
  it.each(CODE_IDS)('%s: conductors and breakers increase in size, and resistance falls', id => {
    const code = ELECTRICAL_CODES[id]
    for (let i = 1; i < code.conductors.length; i++) {
      const [prev, c] = [code.conductors[i - 1]!, code.conductors[i]!]
      expect(c.mm2, c.size).toBeGreaterThan(prev.mm2)
      expect(c.ampacity, c.size).toBeGreaterThan(prev.ampacity)
      expect(c.ohmsPerKm, c.size).toBeLessThan(prev.ohmsPerKm)
      expect(c.maxOcpd, c.size).toBeLessThanOrEqual(c.ampacity)
    }
    for (let i = 1; i < code.breakers.length; i++) expect(code.breakers[i]).toBeGreaterThan(code.breakers[i - 1]!)
    expect(code.acVoltages).toContain(code.defaultAcVoltage)
  })

  it('converts NEC Chapter 9 resistances to Ω/km', () => {
    // 10 AWG: 1.24 Ω/kft × 3.2808 = 4.068 Ω/km
    expect(size(nec, '10 AWG').ohmsPerKm).toBeCloseTo(4.068, 3)
  })

  it('reproduces the AS/NZS 3008.1.2 single-phase voltage drops from IEC 60228 resistance', () => {
    // Table 3.30, single phase touching, 75 °C (mV/A·m) = 2 × resistance at 75 °C (Ω/km).
    // Up to 35 mm² the cable's reactance is negligible, so they agree within 1.5%.
    const published: Record<string, number> = { '2.5 mm²': 18.0, '4 mm²': 11.2, '6 mm²': 7.5, '10 mm²': 4.46, '16 mm²': 2.81, '25 mm²': 1.78, '35 mm²': 1.29 }
    for (const [name, mvPerAm] of Object.entries(published)) {
      expect(Math.abs(2 * size(asnzs, name).ohmsPerKm / mvPerAm - 1), name).toBeLessThan(0.015)
    }
  })

  it('gives PEC sizes NEC-equivalent resistance', () => {
    // 5.5 mm² vs 10 AWG (5.26 mm²): resistance scales with 1/area
    expect(size(pec, '5.5 mm²').ohmsPerKm).toBeCloseTo(size(nec, '10 AWG').ohmsPerKm * 5.26 / 5.5, 1)
  })
})

describe('breakers', () => {
  it('rounds up to the next standard rating, and gives up above the largest', () => {
    expect(nextStandardBreaker(0, nec)).toBe(15)
    expect(nextStandardBreaker(20.1, nec)).toBe(25)
    expect(nextStandardBreaker(600.1, nec)).toBeNull()
    expect(nextStandardBreaker(NaN, nec)).toBe(15)
    // IEC MCB series: 16, 20, 25, 32 …
    expect(nextStandardBreaker(17.4, iec)).toBe(20)
    expect(nextStandardBreaker(26, iec)).toBe(32)
    expect(nextStandardBreaker(631, iec)).toBeNull()
  })

  it('applies the small-conductor limits under NEC and PEC only', () => {
    expect(conductorForBreaker(25, nec)!.size).toBe('10 AWG')
    expect(conductorForBreaker(25, pec)!.size).toBe('5.5 mm²')
    // IEC: In ≤ Iz, so a 25 A breaker can protect 2.5 mm² (27 A)
    expect(conductorForBreaker(25, iec)!.size).toBe('2.5 mm²')
    expect(conductorForBreaker(25, asnzs)!.size).toBe('2.5 mm²')
  })
})

describe('voltage drop', () => {
  it('counts the out-and-back run', () => {
    // 10 AWG: 4.068 Ω/km × 2 × 15 m = 0.1220 Ω; × 12.9 A = 1.575 V; ÷ 62 V = 2.54%
    expect(voltageDropPercent(size(nec, '10 AWG'), 400 / 31, 15, 62)).toBeCloseTo(2.54, 2)
  })

  it('returns 0 rather than Infinity at zero volts', () => {
    expect(voltageDropPercent(size(nec, '10 AWG'), 10, 15, 0)).toBe(0)
  })
})

describe('PV array', () => {
  it('caps the string at the panel count and rounds strings up', () => {
    expect(twoPanels).toMatchObject({ series: 2, strings: 1, even: true, stringVmp: 62, stringVoc: 74 })
    const uneven = pvLayout(21, 10, 400, 31, 37, 13.9)
    expect(uneven).toMatchObject({ series: 10, strings: 3, even: false })
    expect(uneven.arrayIsc).toBeCloseTo(41.7)
  })

  it('uses the shortest string\'s voltage when strings are uneven', () => {
    // 21 panels in strings of 10 → 10 + 10 + 1; the lone panel sets the shared voltage
    const uneven = pvLayout(21, 10, 400, 31, 37, 13.9)
    expect([uneven.shortestSeries, uneven.shortestStringVmp]).toEqual([1, 31])
    expect(pvCircuit(uneven, nec).volts).toBe(31)
  })

  it('has no strings without panels', () => {
    expect(pvLayout(0, 10, 400, 31, 37, 13.9).strings).toBe(0)
  })

  it('NEC: sizes at 156% of Isc', () => {
    // 13.9 A × 1.25 = 17.4 A; × 1.25 = 21.7 A → 25 A breaker → 10 AWG.
    // Voltage drop over 15 m: 12 AWG 4.06%, 10 AWG 2.54% — 10 AWG on both counts.
    const wire = sizeWire(pvCircuit(twoPanels, nec), 15, 3, nec)
    expect(wire.designAmps).toBeCloseTo(21.72, 2)
    expect(wire.breakerAmps).toBe(25)
    expect(wire.conductor!.size).toBe('10 AWG')
    expect(wire.dropPercent).toBeCloseTo(2.54, 2)
  })

  it('PEC: same rules as NEC, metric sizes', () => {
    // 25 A breaker → 5.5 mm² (small-conductor limit 30 A).
    // Drop: 21.4 ÷ 5.5 = 3.891 Ω/km × 0.03 km × 12.9 A = 1.506 V ÷ 62 V = 2.43%
    const wire = sizeWire(pvCircuit(twoPanels, pec), 15, 3, pec)
    expect(wire.breakerAmps).toBe(25)
    expect(wire.conductor!.size).toBe('5.5 mm²')
    expect(wire.dropPercent).toBeCloseTo(2.43, 2)
  })

  it('IEC: 125% of Isc with no second margin, then voltage drop decides', () => {
    // 13.9 A × 1.25 = 17.4 A → 20 A MCB → 2.5 mm² (27 A).
    // Drop at 75 °C (×1.216): 2.5 mm² 5.63%, 4 mm² 3.50%, 6 mm² 2.34% → 6 mm²
    const wire = sizeWire(pvCircuit(twoPanels, iec), 15, 3, iec)
    expect(wire.designAmps).toBeCloseTo(17.375, 3)
    expect(wire.breakerAmps).toBe(20)
    expect(wire.byAmpacity!.size).toBe('2.5 mm²')
    expect(wire.conductor!.size).toBe('6 mm²')
    expect(wire.dropPercent).toBeCloseTo(2.34, 2)
  })

  it('AS/NZS: maximum string current 1.25 × Isc (AS/NZS 5033), cable rated for at least that', () => {
    // 17.4 A → 20 A → 1.5 mm² is 18 A, so 2.5 mm² (26 A); voltage drop again needs 6 mm²
    const wire = sizeWire(pvCircuit(twoPanels, asnzs), 15, 3, asnzs)
    expect(wire.breakerAmps).toBe(20)
    expect(wire.byAmpacity!.size).toBe('2.5 mm²')
    expect(wire.conductor!.size).toBe('6 mm²')
  })
})

describe('battery current', () => {
  it('is worked out at the low-voltage cut-off and full-load efficiency', () => {
    // 2,000 W ÷ (24 V × 0.875 = 21 V × 0.85) = 112.0 A. MPP Solar's manual lists 110 A
    // for its 2 kW / 24 V unit, so this is within 2% and slightly conservative.
    const spec = inverterBatteryCircuit(2000, 24, nec)
    expect(spec.continuousAmps).toBeCloseTo(112.04, 2)
    expect(spec.volts).toBe(21)
  })

  it('counts the charger\'s AC draw at bulk-charge voltage', () => {
    // 30 A × 24 V × 1.2 ÷ 0.85 = 1,016.5 W
    expect(chargerInputWatts(30, 24)).toBeCloseTo(1016.47, 2)
  })
})

describe('cold-weather Voc', () => {
  it('matches the Clean Energy Council\'s worked example', () => {
    // 49.5 V × (1 + −0.27% × (−2 − 25)) = 49.5 × 1.0729 = 53.11 V. The CEC rounds the
    // coefficient to −0.13 V/°C first and gets 53.01 V.
    expect(coldVoc(49.5, -0.27, -2)).toBeCloseTo(53.11, 2)
    expect(coldVoc(49.5, -0.27, 25)).toBe(49.5)
  })
})

describe('sizeWire', () => {
  it('takes the larger of the ampacity and voltage-drop sizes', () => {
    // NEC: 318.75 W ÷ (21 V × 0.85) = 17.86 A; × 1.25 = 22.3 A → 25 A → 10 AWG.
    // Over 2 m at 21 V, 14 AWG drops 3.50% and 12 AWG 2.21%, so ampacity decides.
    const short = sizeWire(inverterBatteryCircuit(318.75, 24, nec), 2, 3, nec)
    expect(short.breakerAmps).toBe(25)
    expect(short.byVoltageDrop!.size).toBe('12 AWG')
    expect(short.conductor!.size).toBe('10 AWG')

    // Over 20 m, voltage drop decides instead.
    const long = sizeWire(inverterBatteryCircuit(318.75, 24, nec), 20, 3, nec)
    expect(long.conductor).toBe(long.byVoltageDrop)
    expect(long.dropPercent).toBeLessThanOrEqual(3)
  })

  it('IEC: no continuous-load margin on the battery cable', () => {
    // 17.86 A → 20 A MCB → 2.5 mm² (27 A; 1.5 mm² is 19.5 A).
    // Drop over 2 m at 21 V: 2.5 mm² 3.07%, 4 mm² 1.91% → 4 mm²
    const wire = sizeWire(inverterBatteryCircuit(318.75, 24, iec), 2, 3, iec)
    expect(wire.breakerAmps).toBe(20)
    expect(wire.byAmpacity!.size).toBe('2.5 mm²')
    expect(wire.conductor!.size).toBe('4 mm²')
    expect(wire.dropPercent).toBeCloseTo(1.91, 2)
  })

  it('reports no breaker or conductor when the current is beyond the tables', () => {
    // 5,000 W at 12 V: 5,000 ÷ (10.5 V × 0.85) = 560 A × 1.25 = 700 A — past the 600 A table
    const wire = sizeWire(inverterBatteryCircuit(5000, 12, nec), 2, 3, nec)
    expect(wire.breakerAmps).toBeNull()
    expect(wire.conductor).toBeNull()
    expect(wire.dropPercent).toBe(0)
  })

  it('stays finite for zero or bad inputs', () => {
    expect(sizeBreaker(inverterBatteryCircuit(NaN, 24, nec), nec).designAmps).toBe(0)
    expect(sizeWire(inverterBatteryCircuit(1000, 24, nec), NaN, 3, nec).conductor).not.toBeNull()
  })
})
