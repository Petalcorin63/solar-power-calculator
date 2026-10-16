/**
 * The clickable system diagram: which parts each system type has, and for each part the
 * inputs it depends on and the computations behind its size, with the user's numbers
 * substituted in. Pure functions, so the explanations are tested alongside the math.
 *
 * Module map:
 *   types.ts     shared shapes (parts, circuits, field keys, context)
 *   constants.ts fixed text and factors
 *   data/        the electrical layout of each drawing
 *   topology.ts  which drawing applies (layoutFor)
 *   context.ts   values every part needs, computed once
 *   circuits.ts  wires and breakers
 *   equipment.ts panels, charge controller, battery, inverter
 *   site.ts      household loads, critical loads, grid / generator
 *   describe.ts  describeSystem: builds every part of the drawing
 */
export type * from './types'
export { NEEDS_INFO } from './constants'
export { batteryText, fmt } from './format'
export { isAllInOne, layoutFor } from './topology'
export { describeSystem, isReady } from './describe'
