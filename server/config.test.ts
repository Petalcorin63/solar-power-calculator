import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTENT_SECURITY_POLICY, DEFAULT_QUOTAS } from './app.js'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('uses a local SQLite file and no proxy trust by default', () => {
    const config = loadConfig({}, false)
    expect(config.db.url).toMatch(/solar\.db$/)
    expect(config.trustProxy).toBe(false)
    expect(config.secureCookies).toBe(false)
    expect(config.quotas).toEqual(DEFAULT_QUOTAS)
  })

  it('on Vercel, uses Turso, trusts the proxy and sets Secure cookies', () => {
    const config = loadConfig({ VERCEL: '1', TURSO_DATABASE_URL: 'libsql://db.example.turso.io', TURSO_AUTH_TOKEN: 't' }, false)
    expect(config.db).toEqual({ url: 'libsql://db.example.turso.io', authToken: 't' })
    expect(config.trustProxy).toBe(true)
    expect(config.secureCookies).toBe(true)
  })

  it('refuses to start on Vercel without a hosted database', () => {
    expect(() => loadConfig({ VERCEL: '1' })).toThrow(/TURSO_DATABASE_URL/)
  })

  it('enables the Turnstile check only when a secret key is set', () => {
    expect(loadConfig({}).turnstileSecretKey).toBeUndefined()
    expect(loadConfig({ TURNSTILE_SECRET_KEY: '' }).turnstileSecretKey).toBeUndefined()
    expect(loadConfig({ TURNSTILE_SECRET_KEY: 'sk' }).turnstileSecretKey).toBe('sk')
  })

  it('reads the sign-up cap and ignores invalid values', () => {
    expect(loadConfig({ MAX_SIGNUPS_PER_DAY: '25' }).quotas.maxSignupsPerDay).toBe(25)
    expect(loadConfig({ MAX_SIGNUPS_PER_DAY: '-3' }).quotas.maxSignupsPerDay).toBe(DEFAULT_QUOTAS.maxSignupsPerDay)
  })
})

describe('vercel.json', () => {
  it('sends the same Content-Security-Policy on the CDN-served page as the API does', () => {
    const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
      headers: { headers: { key: string, value: string }[] }[]
    }
    const csp = vercel.headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy')
    expect(csp?.value).toBe(CONTENT_SECURITY_POLICY)
  })
})
