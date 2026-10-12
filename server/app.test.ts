import { randomBytes, scryptSync } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { openDb } from './db.js'

type App = Awaited<ReturnType<typeof buildApp>>

let app: App

beforeEach(async () => {
  app = await buildApp({ db: await openDb({ url: ':memory:' }), secureCookies: false })
})

const headers = { 'x-requested-with': 'fetch' }

/** Each failed login runs a full scrypt hash (~0.5 s), so tests that make 5–10 of them need longer. */
const HASH_HEAVY_TIMEOUT = 60_000

async function register(email = 'a@example.com', password = 'correct horse') {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', headers, payload: { email, password } })
  const cookie = res.cookies.find(c => c.name === 'session')
  return { res, cookie: cookie ? `session=${cookie.value}` : '' }
}

function api(cookie: string) {
  return {
    get: (url: string) => app.inject({ method: 'GET', url, headers: { cookie } }),
    post: (url: string, payload: object) => app.inject({ method: 'POST', url, headers: { ...headers, cookie }, payload }),
    put: (url: string, payload: object) => app.inject({ method: 'PUT', url, headers: { ...headers, cookie }, payload }),
    delete: (url: string) => app.inject({ method: 'DELETE', url, headers: { ...headers, cookie } }),
  }
}

describe('auth', () => {
  it('registers, reports the session user, and logs out', async () => {
    const { res, cookie } = await register('  Mixed@Example.com ')
    expect(res.statusCode).toBe(201)
    expect(res.json().user.email).toBe('mixed@example.com')
    expect(res.cookies[0]).toMatchObject({ httpOnly: true, sameSite: 'Lax' })

    expect((await api(cookie).get('/api/auth/me')).json().user.email).toBe('mixed@example.com')

    await api(cookie).post('/api/auth/logout', {})
    expect((await api(cookie).get('/api/auth/me')).json().user).toBeNull()
  })

  it('rejects duplicate emails, short passwords and malformed emails', async () => {
    await register('a@example.com')
    expect((await register('A@example.com')).res.statusCode).toBe(409)
    expect((await register('b@example.com', 'short')).res.statusCode).toBe(400)
    expect((await register('not-an-email')).res.statusCode).toBe(400)
  })

  it('logs in with the right password only, with the same error for unknown emails', async () => {
    await register('a@example.com', 'correct horse')
    const login = (email: string, password: string) =>
      app.inject({ method: 'POST', url: '/api/auth/login', headers, payload: { email, password } })

    const ok = await login('A@example.com', 'correct horse')
    expect(ok.statusCode).toBe(200)
    expect(ok.cookies.some(c => c.name === 'session')).toBe(true)

    const wrong = await login('a@example.com', 'wrong password')
    const unknown = await login('nobody@example.com', 'whatever123')
    expect(wrong.statusCode).toBe(401)
    expect(unknown.statusCode).toBe(401)
    expect(wrong.json()).toEqual(unknown.json())
  })

  it('rate-limits repeated login attempts', async () => {
    await register()
    const codes = []
    for (let i = 0; i < 6; i++) {
      const res = await app.inject({
        method: 'POST', url: '/api/auth/login', headers, payload: { email: 'a@example.com', password: 'wrong password' },
      })
      codes.push(res.statusCode)
    }
    expect(codes.slice(0, 5).every(c => c === 401)).toBe(true)
    expect(codes[5]).toBe(429)
  }, HASH_HEAVY_TIMEOUT)

  it('blocks state-changing requests without the CSRF header', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/register', payload: { email: 'a@example.com', password: 'correct horse' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 409, not 500, when two sign-ups for one email race', async () => {
    const codes = (await Promise.all([register('race@example.com'), register('race@example.com')]))
      .map(r => r.res.statusCode)
      .sort()
    expect(codes).toEqual([201, 409])
  })

  it('ends the session a request already carried when signing in again', async () => {
    const { cookie: first } = await register('a@example.com', 'correct horse')
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login', headers: { ...headers, cookie: first },
      payload: { email: 'a@example.com', password: 'correct horse' },
    })
    const second = `session=${res.cookies.find(c => c.name === 'session')!.value}`

    expect((await api(first).get('/api/auth/me')).json().user).toBeNull()
    expect((await api(second).get('/api/auth/me')).json().user.email).toBe('a@example.com')
  })

  it('upgrades a legacy password hash on the next successful login', async () => {
    const db = await openDb({ url: ':memory:' })
    const legacyApp = await buildApp({ db, secureCookies: false })
    const salt = randomBytes(16)
    const key = scryptSync('correct horse', salt, 64, { N: 2 ** 14, r: 8, p: 1 })
    await db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)',
      'old@example.com', `scrypt$${salt.toString('hex')}$${key.toString('hex')}`)

    const res = await legacyApp.inject({
      method: 'POST', url: '/api/auth/login', headers, payload: { email: 'old@example.com', password: 'correct horse' },
    })
    expect(res.statusCode).toBe(200)
    const row = await db.get<{ hash: string }>("SELECT password_hash AS hash FROM users WHERE email = 'old@example.com'")
    expect(row?.hash).toMatch(/^scrypt\$N=131072,/)
  })

  it('rate-limits one address spraying passwords across many accounts', async () => {
    const codes = []
    for (let i = 0; i < 11; i++) {
      const res = await app.inject({
        method: 'POST', url: '/api/auth/login', headers, payload: { email: `user${i}@example.com`, password: 'Password1!' },
      })
      codes.push(res.statusCode)
    }
    expect(codes.slice(0, 10).every(c => c === 401)).toBe(true)
    expect(codes[10]).toBe(429)
  }, HASH_HEAVY_TIMEOUT)

  const loginFrom = (target: App, forwardedFor: string) => target.inject({
    method: 'POST', url: '/api/auth/login', headers: { ...headers, 'x-forwarded-for': forwardedFor },
    payload: { email: 'a@example.com', password: 'wrong password' },
  })

  it('ignores X-Forwarded-For unless a proxy is trusted, so clients cannot dodge limits', async () => {
    for (let i = 0; i < 5; i++) await loginFrom(app, '198.51.100.1')
    expect((await loginFrom(app, '198.51.100.2')).statusCode).toBe(429)
  }, HASH_HEAVY_TIMEOUT)

  it('limits each real client separately behind a trusted proxy', async () => {
    const proxied = await buildApp({ db: await openDb({ url: ':memory:' }), secureCookies: false, trustProxy: true })
    for (let i = 0; i < 5; i++) await loginFrom(proxied, '198.51.100.1')
    expect((await loginFrom(proxied, '198.51.100.1')).statusCode).toBe(429)
    expect((await loginFrom(proxied, '198.51.100.2')).statusCode).toBe(401)
  }, HASH_HEAVY_TIMEOUT)
})

describe('security headers', () => {
  it('sends a strict CSP and hardening headers, and never caches API responses', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['strict-transport-security']).toBeUndefined()
  })

  it('adds HSTS when serving over HTTPS', async () => {
    const secure = await buildApp({ db: await openDb({ url: ':memory:' }), secureCookies: true })
    expect((await secure.inject({ method: 'GET', url: '/api/auth/me' })).headers['strict-transport-security'])
      .toBe('max-age=31536000')
  })
})

describe('projects', () => {
  it('requires sign-in', async () => {
    expect((await api('').get('/api/projects')).statusCode).toBe(401)
    expect((await api('').put('/api/autosave', { data: {} })).statusCode).toBe(401)
  })

  it('creates, lists, loads, renames, updates and deletes', async () => {
    const { cookie } = await register()
    const a = api(cookie)

    const created = await a.post('/api/projects', { name: 'Cabin', data: { systemType: 'off-grid' } })
    expect(created.statusCode).toBe(201)
    const { id } = created.json()

    expect((await a.get('/api/projects')).json().projects).toMatchObject([{ id, name: 'Cabin' }])
    expect((await a.get(`/api/projects/${id}`)).json().data).toEqual({ systemType: 'off-grid' })

    await a.put(`/api/projects/${id}`, { name: 'Cabin v2' })
    await a.put(`/api/projects/${id}`, { data: { systemType: 'hybrid' } })
    expect((await a.get(`/api/projects/${id}`)).json()).toMatchObject({ name: 'Cabin v2', data: { systemType: 'hybrid' } })

    expect((await a.delete(`/api/projects/${id}`)).statusCode).toBe(200)
    expect((await a.get(`/api/projects/${id}`)).statusCode).toBe(404)
  })

  it("can't read or modify another user's project", async () => {
    const alice = api((await register('alice@example.com')).cookie)
    const bob = api((await register('bob@example.com')).cookie)

    const { id } = (await alice.post('/api/projects', { name: 'Private', data: {} })).json()

    expect((await bob.get(`/api/projects/${id}`)).statusCode).toBe(404)
    expect((await bob.put(`/api/projects/${id}`, { name: 'Pwned' })).statusCode).toBe(404)
    expect((await bob.delete(`/api/projects/${id}`)).statusCode).toBe(404)
    expect((await bob.get('/api/projects')).json().projects).toEqual([])
    expect((await alice.get(`/api/projects/${id}`)).json().name).toBe('Private')
  })

  it('rejects non-object data and oversized payloads', async () => {
    const a = api((await register()).cookie)
    expect((await a.post('/api/projects', { name: 'x', data: 'nope' })).statusCode).toBe(400)
    const big = { blob: 'x'.repeat(210_000) }
    expect((await a.post('/api/projects', { name: 'x', data: big })).statusCode).toBe(413)
  })
})

describe('autosave', () => {
  it('stores one working state per user', async () => {
    const a = api((await register()).cookie)
    expect((await a.get('/api/autosave')).json().data).toBeNull()

    await a.put('/api/autosave', { data: { step: 1 } })
    await a.put('/api/autosave', { data: { step: 2 } })
    expect((await a.get('/api/autosave')).json().data).toEqual({ step: 2 })
  })
})

describe('limits shared across server instances', () => {
  // On Vercel each function instance is a separate buildApp() with its own memory;
  // only the database is shared. Two apps on one database model that.
  it('counts login attempts across instances', async () => {
    const db = await openDb({ url: ':memory:' })
    const [first, second] = await Promise.all([
      buildApp({ db, secureCookies: false }),
      buildApp({ db, secureCookies: false }),
    ])
    const login = (target: App) => target.inject({
      method: 'POST', url: '/api/auth/login', headers, payload: { email: 'a@example.com', password: 'wrong password' },
    })
    for (let i = 0; i < 5; i++) await login(i % 2 ? first : second)
    expect((await login(first)).statusCode).toBe(429)
    expect((await login(second)).statusCode).toBe(429)
  }, HASH_HEAVY_TIMEOUT)

  it('caps sign-ups per day across all addresses', async () => {
    const capped = await buildApp({
      db: await openDb({ url: ':memory:' }), secureCookies: false, trustProxy: true, quotas: { maxSignupsPerDay: 2 },
    })
    const signUp = (n: number) => capped.inject({
      method: 'POST', url: '/api/auth/register',
      headers: { ...headers, 'x-forwarded-for': `198.51.100.${n}` },
      payload: { email: `user${n}@example.com`, password: 'correct horse' },
    })
    expect((await signUp(1)).statusCode).toBe(201)
    expect((await signUp(2)).statusCode).toBe(201)
    const third = await signUp(3)
    expect(third.statusCode).toBe(503)
    expect(third.json().error).toMatch(/paused/)
  })
})

describe('storage quotas', () => {
  async function quotaApp(quotas: { maxProjectsPerUser?: number, maxStorageBytesPerUser?: number }) {
    const target = await buildApp({ db: await openDb({ url: ':memory:' }), secureCookies: false, quotas })
    const res = await target.inject({
      method: 'POST', url: '/api/auth/register', headers, payload: { email: 'q@example.com', password: 'correct horse' },
    })
    const cookie = `session=${res.cookies.find(c => c.name === 'session')!.value}`
    const write = (method: 'POST' | 'PUT', url: string, payload: object) =>
      target.inject({ method, url, headers: { ...headers, cookie }, payload })
    return { write }
  }

  it('enforces the per-user project count, even for concurrent saves', async () => {
    const { write } = await quotaApp({ maxProjectsPerUser: 3 })
    const codes = (await Promise.all(Array.from({ length: 6 }, (_, i) =>
      write('POST', '/api/projects', { name: `p${i}`, data: {} }))))
      .map(r => r.statusCode)
    expect(codes.filter(c => c === 201)).toHaveLength(3)
    expect(codes.filter(c => c === 409)).toHaveLength(3)
  })

  it('enforces the per-user storage quota on create and update', async () => {
    const { write } = await quotaApp({ maxStorageBytesPerUser: 1000 })
    const blob = (size: number) => ({ blob: 'x'.repeat(size) })

    const first = await write('POST', '/api/projects', { name: 'a', data: blob(600) })
    expect(first.statusCode).toBe(201)
    expect((await write('POST', '/api/projects', { name: 'b', data: blob(600) })).statusCode).toBe(413)
    // Replacing a project's own data only counts the new size, not old + new.
    expect((await write('PUT', `/api/projects/${first.json().id}`, { data: blob(900) })).statusCode).toBe(200)
  })
})

describe('human verification (Turnstile)', () => {
  /** A fake check that passes only the token 'human', and records what it was asked. */
  function fakeCheck() {
    const calls: { token: string | undefined, ip: string }[] = []
    const verifyHuman = async (token: string | undefined, ip: string) => {
      calls.push({ token, ip })
      return token === 'human'
    }
    return { calls, verifyHuman }
  }

  const authPost = (target: App, url: string, payload: object) =>
    target.inject({ method: 'POST', url, headers, payload })

  it('rejects sign-up and sign-in without a passed check, before any account lookup', async () => {
    const { calls, verifyHuman } = fakeCheck()
    const guarded = await buildApp({ db: await openDb({ url: ':memory:' }), secureCookies: false, verifyHuman })
    const credentials = { email: 'h@example.com', password: 'correct horse' }

    const noToken = await authPost(guarded, '/api/auth/register', credentials)
    expect(noToken.statusCode).toBe(400)
    expect(noToken.json().error).toMatch(/verify you are human/)

    expect((await authPost(guarded, '/api/auth/register', { ...credentials, turnstileToken: 'human' })).statusCode).toBe(201)
    // A bot without a token learns nothing — not even that the email is taken.
    expect((await authPost(guarded, '/api/auth/register', { ...credentials, turnstileToken: 'bot' })).statusCode).toBe(400)

    expect((await authPost(guarded, '/api/auth/login', { ...credentials, turnstileToken: 'bot' })).statusCode).toBe(400)
    expect((await authPost(guarded, '/api/auth/login', { ...credentials, turnstileToken: 'human' })).statusCode).toBe(200)
    expect(calls.every(c => c.ip === '127.0.0.1')).toBe(true)
  })

  it('checks the rate limit first, so blocked clients cost no verification call', async () => {
    const { calls, verifyHuman } = fakeCheck()
    const guarded = await buildApp({ db: await openDb({ url: ':memory:' }), secureCookies: false, verifyHuman })
    for (let i = 0; i < 5; i++) {
      await authPost(guarded, '/api/auth/login', { email: 'a@example.com', password: 'wrong password', turnstileToken: 'bot' })
    }
    const blocked = await authPost(guarded, '/api/auth/login', { email: 'a@example.com', password: 'wrong password' })
    expect(blocked.statusCode).toBe(429)
    expect(calls).toHaveLength(5)
  })

  it('accepts and ignores a token when no check is configured', async () => {
    const res = await authPost(app, '/api/auth/register', { email: 'x@example.com', password: 'correct horse', turnstileToken: 'anything' })
    expect(res.statusCode).toBe(201)
  })
})
