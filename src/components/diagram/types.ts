/** Screen geometry of the diagram drawings (the electrical layout itself is in lib/diagram). */
import type { CircuitId, NodeId, PartId } from '../../lib/diagram'

/** Where one circuit is drawn: its path, its breaker's centre, and its size label. */
export interface WirePosition {
  /** SVG path data. */
  d: string
  breaker: [number, number]
  label: [number, number]
  anchor: 'start' | 'middle' | 'end'
}

/** Positions for one drawing. */
export interface DrawingPositions {
  /** Top-left corner of each equipment box. */
  nodes: Partial<Record<NodeId, [number, number]>>
  wires: Partial<Record<CircuitId, WirePosition>>
  /** Dashed link drawn for context only (main breaker box ↔ utility grid); not a sized part. */
  extraLink?: string
}

/** A row of buttons in the part picker. */
export interface PartGroup {
  label: string
  ids: PartId[]
}
