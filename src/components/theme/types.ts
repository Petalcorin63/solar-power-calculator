/** Shapes for the per-part color scheme and the icon set. */

export type Tone = 'amber' | 'orange' | 'emerald' | 'violet' | 'sky' | 'rose' | 'indigo' | 'slate'

export interface ToneClasses {
  /** Icon badge: tinted background + strong foreground. */
  badge: string
  /** Strong text color. */
  text: string
  /** Thin colored top bar / accent. */
  bar: string
  /** Card border with a hint of the tone. */
  border: string
  /** Very light tinted background. */
  soft: string
  /** Selected chip/button. */
  solid: string
  /** Unselected chip hover border. */
  hover: string
  /** SVG equipment box fill and stroke, plus its selected variant. */
  svgFill: string
  svgStroke: string
  svgFillSelected: string
  /** Small swatch dot. */
  dot: string
  /** Solid SVG fill for icon badges. */
  svgSolid: string
}
export type IconName = 'sun' | 'panel' | 'controller' | 'battery' | 'inverter' | 'home' | 'critical' | 'grid' | 'plug' | 'chart' | 'diagram' | 'book' | 'cable' | 'breaker' | 'offgrid' | 'gridtied' | 'hybrid' | 'folder'
