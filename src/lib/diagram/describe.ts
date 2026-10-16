/** Assembles every part of the current drawing — the diagram module's entry point. */
import { buildContext } from './context'
import { circuitParts } from './circuits'
import { batteryPart, controllerPart, inverterPart, panelsPart } from './equipment'
import { criticalPart, gridPart, loadsPart } from './site'
import { CIRCUITS, NODES } from './data/layouts'
import type { PartDetail, PartId, SystemDiagram } from './types'
import type { ProjectState } from '../project'

export function isReady(part: PartDetail): boolean {
  return part.requires.every(r => r.met)
}

export function describeSystem(s: ProjectState): SystemDiagram {
  const ctx = buildContext(s)
  const { flags, layout } = ctx

  const parts: PartDetail[] = CIRCUITS[layout].flatMap(circuit => circuitParts(ctx, circuit))
  parts.push(panelsPart(ctx))
  if (flags.offGrid && !flags.allInOne) parts.push(controllerPart(ctx))
  if (flags.offGrid || flags.hybrid) parts.push(batteryPart(ctx))
  parts.push(inverterPart(ctx), loadsPart(ctx))
  if (flags.hybrid) parts.push(criticalPart(ctx))
  const grid = gridPart(ctx)
  if (grid) parts.push(grid)

  const byId: Partial<Record<PartId, PartDetail>> = {}
  for (const part of parts) byId[part.id] = part
  return { systemType: s.systemType, layout, code: ctx.code, nodes: NODES[layout], circuits: CIRCUITS[layout], parts: byId }
}
