/**
 * What's on each drawing: which equipment boxes exist and which circuits join them.
 * Positions on screen live in SystemDiagram.vue; this is only the electrical layout.
 */
import type { ProjectState } from '../project'
import type { LayoutKey } from './types'

export function layoutFor(s: Pick<ProjectState, 'systemType' | 'offGridSetup' | 'acInputSource' | 'hybridSetup'>): LayoutKey {
  switch (s.systemType) {
    case 'grid-tied':
      return 'grid-tied'
    case 'hybrid':
      // An all-in-one on a hybrid takes the grid on its AC input from the main breaker box.
      return s.hybridSetup === 'all-in-one' ? 'hybrid-aio' : 'hybrid'
    case 'off-grid':
      if (s.offGridSetup !== 'all-in-one') return 'off-grid'
      return s.acInputSource === 'grid-generator' ? 'off-grid-aio-ac' : 'off-grid-aio'
  }
}

/** True for the drawings built around one all-in-one inverter-charger. */
export function isAllInOne(layout: LayoutKey): boolean {
  return layout === 'off-grid-aio' || layout === 'off-grid-aio-ac' || layout === 'hybrid-aio'
}

/** True when an all-in-one takes grid (or generator) power on its AC input. */
export function hasAcInput(layout: LayoutKey): boolean {
  return layout === 'off-grid-aio-ac' || layout === 'hybrid-aio'
}
