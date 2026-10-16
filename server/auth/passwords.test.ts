import { randomBytes, scryptSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashPassword, needsRehash, verifyPassword } from './passwords.js'

/** A hash in the original `scrypt$salt$key` format (N=2^14, no stored parameters). */
function legacyHash(password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 64, { N: 2 ** 14, r: 8, p: 1 })
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

describe('password hashing', () => {
  it('stores the cost parameters and verifies only the right password', async () => {
    const hash = await hashPassword('correct horse')
    expect(hash).toMatch(/^scrypt\$N=131072,r=8,p=1\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(await verifyPassword('wrong horse', hash)).toBe(false)
    expect(needsRehash(hash)).toBe(false)
  })

  it('still verifies legacy hashes and flags them for re-hashing', async () => {
    const hash = legacyHash('correct horse')
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(needsRehash(hash)).toBe(true)
  })

  it('rejects malformed or tampered hashes instead of running them', async () => {
    const salt = '00'.repeat(16)
    const key = '00'.repeat(64)
    // N=2^30 would need ~1 TB of memory; it must be refused, not attempted.
    expect(await verifyPassword('x', `scrypt$N=1073741824,r=8,p=1$${salt}$${key}`)).toBe(false)
    expect(await verifyPassword('x', `scrypt$N=abc$${salt}$${key}`)).toBe(false)
    expect(await verifyPassword('x', `bcrypt$${salt}$${key}`)).toBe(false)
    expect(await verifyPassword('x', '')).toBe(false)
  })
})
