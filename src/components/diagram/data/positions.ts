/**
 * Where each drawing's boxes and wires sit on screen. Boxes are NODE_WIDTH × NODE_HEIGHT
 * (constants.ts) at the given top-left corner; wires run between their edges. Which boxes
 * and circuits a drawing has is decided in lib/diagram/data/layouts.ts.
 */
import type { LayoutKey } from '../../../lib/diagram'
import type { DrawingPositions } from '../types'

// Panels top left and battery bottom left, both wired into the one inverter box.
const PANELS_AND_BATTERY_TO_INVERTER = {
  pv: { d: 'M120 112 V162 H300', breaker: [210, 162], label: [210, 142], anchor: 'middle' },
  battery: { d: 'M120 248 V198 H300', breaker: [210, 198], label: [210, 226], anchor: 'middle' },
} satisfies DrawingPositions['wires']

export const POSITIONS: Record<LayoutKey, DrawingPositions> = {
  // All-in-one inverter: panels and battery both wire straight into the one box.
  'off-grid-aio': {
    nodes: { panels: [40, 40], battery: [40, 248], inverter: [300, 144], loads: [560, 144] },
    wires: {
      ...PANELS_AND_BATTERY_TO_INVERTER,
      load: { d: 'M460 180 H560', breaker: [510, 180], label: [510, 160], anchor: 'middle' },
    },
  },
  // …with a grid or generator feeding its AC input (top right).
  'off-grid-aio-ac': {
    nodes: { panels: [40, 40], battery: [40, 248], inverter: [300, 144], grid: [560, 40], loads: [560, 248] },
    wires: {
      ...PANELS_AND_BATTERY_TO_INVERTER,
      grid: { d: 'M560 76 H510 V165 H460', breaker: [510, 120], label: [476, 124], anchor: 'end' },
      load: { d: 'M460 200 H510 V284 H560', breaker: [510, 241], label: [476, 245], anchor: 'end' },
    },
  },
  'off-grid': {
    nodes: { panels: [40, 40], controller: [300, 40], battery: [300, 248], inverter: [560, 248], loads: [560, 40] },
    wires: {
      pv: { d: 'M200 76 H300', breaker: [250, 76], label: [250, 56], anchor: 'middle' },
      charge: { d: 'M380 112 V248', breaker: [380, 180], label: [414, 184], anchor: 'start' },
      battery: { d: 'M460 284 H560', breaker: [510, 284], label: [510, 318], anchor: 'middle' },
      load: { d: 'M640 248 V112', breaker: [640, 180], label: [674, 184], anchor: 'start' },
    },
  },
  'grid-tied': {
    nodes: { panels: [40, 40], inverter: [300, 40], loads: [560, 40], grid: [560, 248] },
    wires: {
      pv: { d: 'M200 76 H300', breaker: [250, 76], label: [250, 56], anchor: 'middle' },
      grid: { d: 'M460 76 H560', breaker: [510, 76], label: [510, 56], anchor: 'middle' },
    },
    extraLink: 'M640 112 V248',
  },
  // Grid on top, the main breaker box (whole house) below it, critical loads at the bottom:
  // the inverter ties into the grid through the main breaker box and backs up the critical loads.
  hybrid: {
    nodes: { panels: [40, 40], battery: [40, 248], inverter: [300, 144], grid: [560, 40], loads: [560, 144], critical: [560, 248] },
    wires: {
      ...PANELS_AND_BATTERY_TO_INVERTER,
      // Label sits left of centre so its red dot clears the main breaker box's icon badge.
      grid: { d: 'M460 170 H560', breaker: [510, 170], label: [496, 150], anchor: 'middle' },
      load: { d: 'M460 200 H510 V284 H560', breaker: [510, 241], label: [476, 245], anchor: 'end' },
    },
    extraLink: 'M640 112 V144',
  },
  // All-in-one on a hybrid: same drawing — the main breaker box feeds its AC input instead.
  'hybrid-aio': {
    nodes: { panels: [40, 40], battery: [40, 248], inverter: [300, 144], grid: [560, 40], loads: [560, 144], critical: [560, 248] },
    wires: {
      ...PANELS_AND_BATTERY_TO_INVERTER,
      grid: { d: 'M460 170 H560', breaker: [510, 170], label: [496, 150], anchor: 'middle' },
      load: { d: 'M460 200 H510 V284 H560', breaker: [510, 241], label: [476, 245], anchor: 'end' },
    },
    extraLink: 'M640 112 V144',
  },
}
