/**
 * What's on each drawing: which equipment boxes exist and which circuits join them.
 * Positions on screen live in SystemDiagram.vue; this is only the electrical layout.
 */
import type { Circuit, LayoutKey, NodeId } from '../types'

const AIO_DC_CIRCUITS: Circuit[] = [
  { id: 'pv', from: 'panels', to: 'inverter', label: 'Panels → all-in-one inverter', dc: true, runKey: 'pvRunM' },
  { id: 'battery', from: 'battery', to: 'inverter', label: 'Battery ↔ all-in-one inverter', dc: true, runKey: 'batteryRunM' },
]

export const CIRCUITS: Record<LayoutKey, Circuit[]> = {
  'off-grid': [
    { id: 'pv', from: 'panels', to: 'controller', label: 'Panels → charge controller', dc: true, runKey: 'pvRunM' },
    { id: 'charge', from: 'controller', to: 'battery', label: 'Charge controller → battery', dc: true, runKey: 'chargeRunM' },
    { id: 'battery', from: 'battery', to: 'inverter', label: 'Battery → inverter', dc: true, runKey: 'batteryRunM' },
    { id: 'load', from: 'inverter', to: 'loads', label: 'Inverter → household loads', dc: false, runKey: 'loadRunM' },
  ],
  'off-grid-aio': [
    ...AIO_DC_CIRCUITS,
    { id: 'load', from: 'inverter', to: 'loads', label: 'All-in-one inverter → household loads', dc: false, runKey: 'loadRunM' },
  ],
  'off-grid-aio-ac': [
    ...AIO_DC_CIRCUITS,
    { id: 'load', from: 'inverter', to: 'loads', label: 'All-in-one inverter → household loads', dc: false, runKey: 'loadRunM' },
    { id: 'grid', from: 'grid', to: 'inverter', label: 'Grid / generator → all-in-one inverter (AC in)', dc: false, runKey: 'gridRunM' },
  ],
  'grid-tied': [
    { id: 'pv', from: 'panels', to: 'inverter', label: 'Panels → inverter', dc: true, runKey: 'pvRunM' },
    { id: 'grid', from: 'inverter', to: 'loads', label: 'Inverter → main breaker box', dc: false, runKey: 'gridRunM' },
  ],
  hybrid: [
    { id: 'pv', from: 'panels', to: 'inverter', label: 'Panels → hybrid inverter', dc: true, runKey: 'pvRunM' },
    { id: 'battery', from: 'battery', to: 'inverter', label: 'Battery ↔ hybrid inverter', dc: true, runKey: 'batteryRunM' },
    { id: 'load', from: 'inverter', to: 'critical', label: 'Inverter → backup breaker box', dc: false, runKey: 'loadRunM' },
    { id: 'grid', from: 'inverter', to: 'loads', label: 'Inverter ↔ main breaker box (grid)', dc: false, runKey: 'gridRunM' },
  ],
  'hybrid-aio': [
    ...AIO_DC_CIRCUITS,
    { id: 'load', from: 'inverter', to: 'critical', label: 'All-in-one inverter → backup breaker box', dc: false, runKey: 'loadRunM' },
    { id: 'grid', from: 'loads', to: 'inverter', label: 'Main breaker box → all-in-one inverter (AC in)', dc: false, runKey: 'gridRunM' },
  ],
}

export const NODES: Record<LayoutKey, NodeId[]> = {
  'off-grid': ['panels', 'controller', 'battery', 'inverter', 'loads'],
  'off-grid-aio': ['panels', 'battery', 'inverter', 'loads'],
  'off-grid-aio-ac': ['panels', 'battery', 'inverter', 'loads', 'grid'],
  'grid-tied': ['panels', 'inverter', 'loads', 'grid'],
  hybrid: ['panels', 'battery', 'inverter', 'loads', 'critical', 'grid'],
  'hybrid-aio': ['panels', 'battery', 'inverter', 'loads', 'critical', 'grid'],
}
