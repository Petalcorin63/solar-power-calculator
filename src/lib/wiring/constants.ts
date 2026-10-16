/** Fixed factors for wire and breaker sizing. Sources are cited in the "Formulas & references" panel. */

/**
 * Inverter efficiency at full load, used to turn AC output into battery current. The MPP
 * Solar PIP-LV-MK manual's battery-cable currents imply about 85% (e.g. 2 kW at 24 V →
 * 110 A); peak efficiency is higher, but cables must carry the full-load current.
 */
export const INVERTER_EFFICIENCY = 0.85

/**
 * Battery voltage at the inverter's low-voltage cut-off, as a share of nominal. The
 * inverter draws the most current just before it cuts off — the same manual lists
 * cut-off at 10.5 / 21 / 42 V for 12 / 24 / 48 V systems, i.e. 87.5%.
 */
export const LOW_BATTERY_FACTOR = 0.875

/**
 * Battery voltage while bulk charging, as a share of nominal (the manual's flooded bulk
 * setting is 29.2 V on 24 V, ≈ 1.2×). A charger delivering a set current draws more AC
 * power at this voltage than at nominal.
 */
export const CHARGE_VOLTAGE_FACTOR = 1.2

/** Temperature panels are rated at (STC); Voc rises below it. */
export const STC_CELL_TEMP_C = 25

export const METERS_PER_KFT = 304.8
/** Copper resistance rises 0.393%/°C (IEC 60028 / NIST Handbook 100). */
export const COPPER_TEMP_COEFFICIENT = 0.00393
/** Conductor temperature the resistance tables are corrected to. */
export const CONDUCTOR_TEMP_C = 75
