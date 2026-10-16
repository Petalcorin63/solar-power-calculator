/** Shapes for wire and breaker sizing: conductors, electrical codes, and circuit sizing results. */

export type CodeId = 'nec' | 'pec' | 'iec' | 'asnzs'
export type AcVoltage = 120 | 230 | 240

export interface Conductor {
  /** Size as the code names it: AWG/kcmil, or mm². */
  size: string
  /** Cross-section in mm². */
  mm2: number
  /** Current-carrying capacity at the code's reference conditions (see `ElectricalCode.ampacityBasis`). */
  ampacity: number
  /** Largest breaker/fuse allowed on it. Below `ampacity` only for the NEC/PEC small-conductor limits. */
  maxOcpd: number
  /** DC resistance at 75 °C, Ω per km. */
  ohmsPerKm: number
}

/** One location's rules and tables, chosen with the diagram's location selector. */
export interface ElectricalCode {
  id: CodeId
  /** Selector label. */
  label: string
  /** Standards it follows, for the explanations. */
  standard: string
  conductors: Conductor[]
  /** Standard breaker/fuse ratings, ascending. */
  breakers: number[]
  /** Maximum PV circuit current = array Isc × this. */
  pvCurrentFactor: number
  /** Breaker and conductor are sized at the maximum PV current × this. */
  pvDesignFactor: number
  /** Breaker and conductor are sized at the continuous current × this, for inverter, battery and charge circuits. */
  continuousFactor: number
  acVoltages: AcVoltage[]
  defaultAcVoltage: AcVoltage
  /** Rule names shown in each step. */
  rules: { pvCurrent: string, breaker: string, conductor: string }
  /** Conditions the ampacity table assumes. */
  ampacityBasis: string
  /** Region-specific caveats shown on every wire and breaker. */
  notes: string[]
  /** Reference ids (see lib/references) for this code's tables. */
  references: string[]
}

/** The electrical facts about one circuit that its breaker and wire are sized from. */
export interface CircuitSpec {
  /** Current the breaker and conductor are sized from (before `factor`). */
  continuousAmps: number
  /** Normal operating current, used for voltage drop. */
  operatingAmps: number
  /** Operating voltage of the circuit. */
  volts: number
  /** Multiplier applied to `continuousAmps` for sizing (the code's continuous or PV design factor). */
  factor: number
}

export interface BreakerSizing {
  designAmps: number
  /** Standard rating, or null when it exceeds the table (split the circuit or raise the voltage). */
  breakerAmps: number | null
}

export interface WireSizing extends BreakerSizing {
  byAmpacity: Conductor | null
  byVoltageDrop: Conductor | null
  /** The larger of the two, or null if either is beyond the table. */
  conductor: Conductor | null
  /** Voltage drop with the chosen conductor. */
  dropPercent: number
}

/** How the panels are wired into strings, and the string's electrical values. */
export interface PvLayout {
  /** Panels wired in series per string (the full strings). */
  series: number
  /** Panels in the shortest string — fewer than `series` when the count doesn't divide evenly. */
  shortestSeries: number
  /** Parallel strings. The last one may be short if the panel count doesn't divide evenly. */
  strings: number
  /** True when every string has the same number of panels. */
  even: boolean
  /** Vmp of a full string. */
  stringVmp: number
  /** Vmp of the shortest string: the lowest operating voltage, so the worst case for voltage drop. */
  shortestStringVmp: number
  /** Voc of a full string at 25 °C. */
  stringVoc: number
  /** Combined Isc of all strings. */
  arrayIsc: number
  /** Combined current at maximum power: string count × (panel watts ÷ Vmp). */
  arrayImp: number
}
