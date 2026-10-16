/**
 * Password hashing with scrypt (Node's built-in), at OWASP's recommended cost.
 *
 * Hashes are stored as `scrypt$N=…,r=…,p=…$<salt hex>$<key hex>`, so the cost travels
 * with each hash: it can be raised later, and older hashes are upgraded on the next
 * successful login (see `needsRehash`).
 */
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { LEGACY_SCRYPT_COST, MAX_SCRYPT_COST, SALT_LENGTH, SCRYPT_COST, SCRYPT_KEY_LENGTH } from './constants.js'
import type { ScryptCost } from './types.js'

function scryptAsync(password: string, salt: Buffer, cost: ScryptCost): Promise<Buffer> {
  const options: ScryptOptions = { ...cost, maxmem: 256 * cost.N * cost.r }
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, options, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await scryptAsync(password, salt, SCRYPT_COST)
  const { N, r, p } = SCRYPT_COST
  return `scrypt$N=${N},r=${r},p=${p}$${salt.toString('hex')}$${key.toString('hex')}`
}

/** Reads a stored hash; null for anything malformed (which then never verifies). */
function parseHash(stored: string): { cost: ScryptCost, salt: Buffer, key: Buffer } | null {
  const parts = stored.split('$')
  if (parts[0] !== 'scrypt') return null

  let cost = LEGACY_SCRYPT_COST
  if (parts.length === 4) {
    const match = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(parts[1] ?? '')
    if (!match) return null
    cost = { N: Number(match[1]), r: Number(match[2]), p: Number(match[3]) }
    const max = MAX_SCRYPT_COST
    const inBounds = cost.N >= 2 && cost.N <= max.N && cost.r >= 1 && cost.r <= max.r && cost.p >= 1 && cost.p <= max.p
    if (!inBounds) return null
  } else if (parts.length !== 3) {
    return null
  }

  const [saltHex, keyHex] = parts.slice(-2)
  if (!saltHex || !keyHex) return null
  return { cost, salt: Buffer.from(saltHex, 'hex'), key: Buffer.from(keyHex, 'hex') }
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored)
  if (!parsed) return false
  const actual = await scryptAsync(password, parsed.salt, parsed.cost)
  return actual.length === parsed.key.length && timingSafeEqual(actual, parsed.key)
}

/** True for hashes made with an older, weaker cost — re-hash them on the next successful login. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored)
  if (!parsed) return true
  const { N, r, p } = parsed.cost
  return N !== SCRYPT_COST.N || r !== SCRYPT_COST.r || p !== SCRYPT_COST.p
}

let dummy: Promise<string> | undefined

/**
 * A hash of a random password, checked against when a login email doesn't exist so
 * unknown and known emails take the same time to reject. Computed once; buildApp
 * starts it at startup so the first such login isn't slower.
 */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(SALT_LENGTH).toString('hex'))
  return dummy
}
