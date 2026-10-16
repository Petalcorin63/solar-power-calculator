/**
 * Shapes shared by the diagram modules and the SystemDiagram component.
 *
 * Vocabulary: a *node* is a piece of equipment (or the grid / loads) drawn as a box; a
 * *circuit* is the cable between two nodes, which gets both a wire and a breaker *part*.
 * Every clickable thing on the diagram is a part, identified by a `PartId`.
 */
import type { ProjectState, RunLengthKey } from '../project'
import type { SystemType } from '../sizing'
import type { BatteryLayout } from '../sizing'
import type { CircuitSpec, ElectricalCode, PvLayout } from '../wiring'

export type NodeId = 'panels' | 'controller' | 'battery' | 'inverter' | 'loads' | 'critical' | 'grid'
export type CircuitId = 'pv' | 'charge' | 'battery' | 'load' | 'grid'
export type PartId = NodeId | `wire:${CircuitId}` | `breaker:${CircuitId}`

/** Inputs a part can ask for; `PartField.vue` knows how to render each one. */
export type FieldKey = keyof ProjectState & (
  | 'appliances' | 'criticalAppliances'
  | 'peakSunHours' | 'systemDeratePercent' | 'panelWatts' | 'dcAcRatio'
  | 'annualUsageKwh' | 'offsetPercent'
  | 'systemVoltage' | 'batteryChemistry' | 'batteryAh' | 'batteryVoltage'
  | 'daysOfAutonomy' | 'backupDays' | 'inverterMarginPercent'
  | 'panelVoc' | 'panelVmp' | 'panelIsc' | 'panelsPerString' | 'vocTempCoeffPercent' | 'lowestTempC'
  | 'acVoltage' | 'maxVoltageDropPercent' | 'electricalCode' | RunLengthKey
  | 'offGridSetup' | 'hybridSetup' | 'acInputSource' | 'acChargeAmps' | 'batteryChargeAmps'
)

/** One line of a part's working: what's computed, the formula with numbers in, the answer. */
export interface Step {
  label: string
  formula: string
  result: string
}

/** Something that must be filled in (or sized upstream) before a part can be computed. */
export interface Requirement {
  label: string
  met: boolean
  /** Fields that satisfy it, shown inline in the "fill these in first" box. */
  fields?: FieldKey[]
  /** Or the part where it gets sized, offered as a link. */
  part?: PartId
}

export interface PartDetail {
  id: PartId
  title: string
  /** Short result shown on the diagram, e.g. "10 AWG" — or "needs info". */
  headline: string
  requires: Requirement[]
  /** Inputs that change this part's result, editable in the detail panel. */
  inputs: FieldKey[]
  steps: Step[]
  notes: string[]
  related: PartId[]
}

export interface Circuit {
  id: CircuitId
  from: NodeId
  to: NodeId
  label: string
  /** DC circuits need DC-rated protection and are drawn in a different color. */
  dc: boolean
  /** The state field holding this run's one-way cable length. */
  runKey: RunLengthKey
}

/**
 * Which drawing to use. Off-grid has three variants: separate equipment, or an all-in-one
 * inverter (built-in MPPT and battery charger, e.g. PowMr or MPP Solar) with or without a
 * grid/generator on its AC input. Hybrid has two: a grid-interactive hybrid inverter, or
 * an all-in-one fed from the grid.
 */
export type LayoutKey = SystemType | 'off-grid-aio' | 'off-grid-aio-ac' | 'hybrid-aio'

export interface SystemDiagram {
  systemType: SystemType
  layout: LayoutKey
  code: ElectricalCode
  nodes: NodeId[]
  circuits: Circuit[]
  parts: Partial<Record<PartId, PartDetail>>
}


/** Equipment sizes, the same shape whichever system type produced them. */
export interface Sized {
  arrayWattsNeeded: number
  panelCount: number
  installedWatts: number
  bankWh: number
  bankAh: number
  batteries: BatteryLayout
  /** Inverter carrying the battery-backed loads: the off-grid inverter, or the hybrid's backup side. */
  loadInverterWatts: number
  /** Grid-tie (or hybrid solar-side) AC rating, from the panels. 0 when there's no export. */
  gridInverterWatts: number
  productionKwh: number
  /** Solar the home can use — less than production when the inverter can't export. */
  usableKwh: number
}

/** Everything the part builders share, computed once per `describeSystem` call (see context.ts). */
export interface DiagramContext {
  s: ProjectState
  code: ElectricalCode
  layout: LayoutKey
  sized: Sized
  pv: PvLayout
  /** Nominal battery bank voltage. */
  batteryVolts: number
  flags: {
    offGrid: boolean
    gridTied: boolean
    hybrid: boolean
    /** One all-in-one inverter-charger instead of separate controller and inverter. */
    allInOne: boolean
    /** An all-in-one with grid/generator power on its AC input. */
    acInput: boolean
    hybridAllInOne: boolean
    /** NEC-family code (US, Philippines): 125% factors, NEC section names in the notes. */
    necFamily: boolean
  }
  /** Battery-side AC charging current; 0 without an AC input. */
  acChargeAmps: number
  loads: {
    householdWh: number
    householdPeakW: number
    criticalWh: number
    /** What the battery carries: critical loads on a hybrid, everything off-grid. */
    batteryLoadsWh: number
    batteryLoadsPeakW: number
  }
  /** Inverter headroom as a multiplier, e.g. 1.25. */
  inverterMargin: number
  requires: {
    panelsSized: Requirement
    iscEntered: Requirement
    vmpEntered: Requirement
    loadInverterSized: Requirement
    hybridChargeCurrentEntered: Requirement
  }
}

/** Where a circuit's current comes from, ready for its breaker and wire to be sized. */
export interface CircuitCurrent {
  spec: CircuitSpec
  /** The first step shown for both the wire and the breaker: where the current comes from. */
  currentStep: Step
  requires: Requirement[]
  inputs: FieldKey[]
}
