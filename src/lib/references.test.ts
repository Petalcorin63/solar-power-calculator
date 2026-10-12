import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REFERENCES, REFERENCES_REVIEWED, citationNumber, formatIsoDate } from './references'
import { DEPTH_OF_DISCHARGE } from './solar'

const panel = readFileSync(new URL('../components/ReferencesPanel.vue', import.meta.url), 'utf8')
const citedIds = [...panel.matchAll(/<CiteRef id="([^"]+)"/g)].map(m => m[1])

describe('references', () => {
  it('has unique ids, https links and valid access dates no later than the review date', () => {
    expect(new Set(REFERENCES.map(r => r.id)).size).toBe(REFERENCES.length)
    for (const r of REFERENCES) {
      expect(r.url).toMatch(/^https:\/\//)
      expect(r.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(r.accessed))).toBe(false)
      expect(r.accessed <= REFERENCES_REVIEWED).toBe(true)
      expect(r.updated.trim()).not.toBe('')
    }
  })

  it('every citation in the panel points to a listed reference, and every reference is cited', () => {
    expect(citedIds.length).toBeGreaterThan(0)
    for (const id of citedIds) expect(() => citationNumber(id)).not.toThrow()
    for (const r of REFERENCES) expect(citedIds).toContain(r.id)
  })

  it('numbers citations in list order and rejects unknown ids', () => {
    expect(citationNumber(REFERENCES[0].id)).toBe(1)
    expect(citationNumber(REFERENCES.at(-1)!.id)).toBe(REFERENCES.length)
    expect(() => citationNumber('nope')).toThrow(/Unknown reference/)
  })

  it('formats dates without depending on the viewer’s locale or time zone', () => {
    expect(formatIsoDate('2026-10-04')).toBe('4 October 2026')
    expect(formatIsoDate('2024-01-31')).toBe('31 January 2024')
  })

  it('treats flooded and AGM lead-acid alike, as the panel describes one "lead-acid" figure', () => {
    expect(DEPTH_OF_DISCHARGE.flooded).toBe(DEPTH_OF_DISCHARGE.agm)
  })
})
