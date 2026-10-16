/**
 * One color and icon per part of the system, used everywhere that part appears — input
 * sections, result cards and the diagram — so a color always means the same thing.
 */
import type { NodeId } from '../../../lib/diagram'
import type { IconName, Tone } from '../types'

export const NODE_TONES: Record<NodeId, Tone> = {
  panels: 'amber',
  controller: 'orange',
  battery: 'emerald',
  inverter: 'violet',
  loads: 'sky',
  critical: 'rose',
  grid: 'indigo',
}
export const NODE_ICONS: Record<NodeId, IconName> = {
  panels: 'panel',
  controller: 'controller',
  battery: 'battery',
  inverter: 'inverter',
  loads: 'home',
  critical: 'critical',
  grid: 'grid',
}