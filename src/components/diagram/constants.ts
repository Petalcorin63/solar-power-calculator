/** Drawing size, in SVG units (the drawing scales to its container). */
import type { PartId } from '../../lib/diagram'

export const DRAWING_WIDTH = 760
export const DRAWING_HEIGHT = 360
export const NODE_WIDTH = 160
export const NODE_HEIGHT = 72

/** Selected when the page opens, and whenever the selected part leaves the drawing. */
export const DEFAULT_PART: PartId = 'panels'
