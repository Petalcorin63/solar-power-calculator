import { describe, expect, it } from 'vitest'
import { originalUrl } from './original-url.js'

describe('originalUrl', () => {
  it('leaves original URLs alone', () => {
    expect(originalUrl('/api/auth/me')).toBe('/api/auth/me')
    expect(originalUrl('/api/projects/3?x=1')).toBe('/api/projects/3?x=1')
    expect(originalUrl('/api')).toBe('/api')
  })

  it('rebuilds the original path from the rewritten form, keeping other query params', () => {
    expect(originalUrl('/api?path=auth/me')).toBe('/api/auth/me')
    expect(originalUrl('/api?path=projects/3&x=1')).toBe('/api/projects/3?x=1')
  })
})
