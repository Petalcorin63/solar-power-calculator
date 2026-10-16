/** Names, colors and icons for diagram parts, worked out from the current drawing. */
import { isAllInOne, type CircuitId, type NodeId, type PartId, type SystemDiagram } from '../../lib/diagram'
import { NODE_ICONS, NODE_TONES, TONES, type IconName, type ToneClasses } from '../theme'
import type { WirePosition } from './types'

/** What each box is called on this drawing — e.g. the inverter box is a "Hybrid inverter" on hybrid systems. */
export function nodeLabels(diagram: SystemDiagram): Record<NodeId, string> {
  const type = diagram.systemType
  const allInOne = isAllInOne(diagram.layout)
  return {
    panels: 'Solar panels',
    controller: 'Charge controller',
    battery: 'Battery bank',
    inverter: allInOne ? 'All-in-one inverter' : type === 'hybrid' ? 'Hybrid inverter' : type === 'grid-tied' ? 'Grid-tie inverter' : 'Inverter',
    // On grid-connected systems this box is the whole house, fed from the main breaker box.
    loads: type === 'off-grid' ? 'Household loads' : 'Main breaker box',
    critical: 'Critical loads',
    grid: type === 'off-grid' ? 'Grid / generator' : 'Utility grid',
  }
}

/** Splits "wire:pv" into its kind and circuit; a box id has no circuit. */
function splitPartId(id: PartId): { kind: string, circuitId: CircuitId | undefined } {
  const [kind, circuitId] = id.split(':') as [string, CircuitId | undefined]
  return { kind, circuitId }
}

/** A part's name. `withKind` adds "Wire:"/"Breaker:", not needed inside the already-labelled picker rows. */
export function partLabel(diagram: SystemDiagram, id: PartId, withKind = true): string {
  const { kind, circuitId } = splitPartId(id)
  if (!circuitId) return nodeLabels(diagram)[id as NodeId]
  const label = diagram.circuits.find(c => c.id === circuitId)?.label ?? circuitId
  return withKind ? `${kind === 'wire' ? 'Wire' : 'Breaker'}: ${label}` : label
}

export function nodeTone(node: NodeId): ToneClasses {
  return TONES[NODE_TONES[node]]
}

/** Equipment uses its own color; wires and breakers are neutral, AC wires blue like on the drawing. */
export function partTone(diagram: SystemDiagram, id: PartId): ToneClasses {
  const { kind, circuitId } = splitPartId(id)
  if (!circuitId) return nodeTone(id as NodeId)
  const circuit = diagram.circuits.find(c => c.id === circuitId)
  return TONES[kind === 'wire' && circuit && !circuit.dc ? 'sky' : 'slate']
}

export function partIcon(id: PartId): IconName {
  const { kind, circuitId } = splitPartId(id)
  if (!circuitId) return NODE_ICONS[id as NodeId]
  return kind === 'wire' ? 'cable' : 'breaker'
}

/** Puts a wire's red dot just past its "size ?" label (≈ 47 units wide), whichever way the label is anchored. */
export function wireDotX(wire: WirePosition): number {
  const [x] = wire.label
  return wire.anchor === 'start' ? x + 54 : wire.anchor === 'end' ? x - 54 : x + 30
}
