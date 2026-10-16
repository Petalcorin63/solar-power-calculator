/** The calculator every tab shares: the live inputs and everything computed from them. */
import type { ComputedRef } from 'vue'
import type { SystemDiagram } from '../../lib/diagram'
import type { ProjectState } from '../../lib/project'
import type { GridTiedResults, HybridResults, OffGridResults } from '../../lib/sizing'

export interface Calculator {
  /**
   * Every input, as one reactive object. Components edit it directly (`v-model="inputs.batteryAh"`);
   * it's the app's state, not a prop copy, so edits show up on every tab.
   */
  inputs: ProjectState
  offGrid: ComputedRef<OffGridResults>
  gridTied: ComputedRef<GridTiedResults>
  hybrid: ComputedRef<HybridResults>
  /** The system diagram's parts and worked steps for the current inputs. */
  diagram: ComputedRef<SystemDiagram>
  /** How many diagram parts still need inputs from the user (the red dots). */
  needsInfoCount: ComputedRef<number>
  /** A plain copy of the inputs, for saving; changes whenever any input does. */
  snapshot: ComputedRef<ProjectState>
  /** Replaces every input, e.g. with a loaded project. */
  restore: (state: ProjectState) => void
}
