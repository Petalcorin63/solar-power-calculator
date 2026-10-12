import { describe, expect, it } from 'vitest'
import { LIMITS, defaultProjectState, parseProjectState } from './project'
import { dailyLoadWh } from './solar'

describe('parseProjectState', () => {
  it('round-trips a valid state unchanged', () => {
    const state = { ...defaultProjectState(), systemType: 'hybrid' as const, panelWatts: 550 }
    expect(parseProjectState(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('falls back to defaults for missing, garbage or non-object input', () => {
    expect(parseProjectState(null)).toEqual(defaultProjectState())
    expect(parseProjectState('nope')).toEqual(defaultProjectState())
    expect(parseProjectState({})).toEqual(defaultProjectState())
  })

  it('replaces invalid fields individually, clamps out-of-range numbers, and keeps valid ones', () => {
    const parsed = parseProjectState({
      systemType: 'nuclear',
      systemDeratePercent: 500,
      peakSunHours: 'lots',
      panelWatts: 450,
      systemVoltage: 36,
    })
    const d = defaultProjectState()
    expect(parsed.systemType).toBe(d.systemType)
    expect(parsed.systemDeratePercent).toBe(LIMITS.systemDeratePercent.max)
    expect(parsed.peakSunHours).toBe(d.peakSunHours)
    expect(parsed.systemVoltage).toBe(d.systemVoltage)
    expect(parsed.panelWatts).toBe(450)
  })

  it('cleans appliance rows and renumbers ids', () => {
    const parsed = parseProjectState({
      appliances: [
        { id: 99, name: 'Pump', watts: 500, hours: 2, quantity: 1 },
        'junk',
        { id: 99, name: 42, watts: -5, hours: 30, quantity: 'x' },
      ],
    })
    expect(parsed.appliances).toEqual([
      { id: 1, name: 'Pump', watts: 500, hours: 2, quantity: 1 },
      { id: 2, name: 'Appliance', watts: 0, hours: 24, quantity: 1 },
    ])
  })

  it('round-trips every numeric field at both ends of its allowed range', () => {
    // The form fields take their min/max from LIMITS, so anything they accept must
    // reload unchanged — previously e.g. 30 peak sun hours reloaded as 4.5.
    for (const bound of ['min', 'max'] as const) {
      const state = defaultProjectState()
      const row = state.appliances[0]
      row.watts = LIMITS.applianceWatts[bound]
      row.hours = LIMITS.applianceHours[bound]
      row.quantity = LIMITS.applianceQuantity[bound]
      for (const key of Object.keys(LIMITS)) {
        if (key in state) (state as unknown as Record<string, number>)[key] = LIMITS[key as keyof typeof LIMITS][bound]
      }
      expect(parseProjectState(JSON.parse(JSON.stringify(state)))).toEqual(state)
    }
  })

  it('keeps an old save close to what was on screen instead of resetting rows', () => {
    // Before the table validated input, 25 h/day could be saved; on screen the fridge
    // used 150 W × 25 h = 3,750 Wh, and on reload it silently became 0 h (0 Wh).
    // Clamping to 24 h gives 3,600 Wh — the nearest value the form now allows.
    const parsed = parseProjectState({
      appliances: [{ name: 'Refrigerator', watts: 150, hours: 25, quantity: 1 }],
    })
    expect(dailyLoadWh(parsed.appliances)).toBe(3600)
  })

  it('keeps battery voltage at or below system voltage', () => {
    expect(parseProjectState({ systemVoltage: 12, batteryVoltage: 48 }).batteryVoltage).toBe(12)
  })
})
