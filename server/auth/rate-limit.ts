/**
 * Fixed-window rate limits for sign-in and sign-up, stored in the database so every
 * server instance (each Vercel function instance, or a restarted process) shares the
 * same counts. The limits themselves are in constants.ts.
 */
import type { Db } from '../db/index.js'
import { IPV6_GROUPS, IPV6_PREFIX_GROUPS } from './constants.js'
import type { RateLimit } from './types.js'

/**
 * Rate-limit key for a client address. IPv6 users typically control a whole /64, so
 * keying on the full address would let one client rotate through billions of keys.
 */
export function clientKey(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  if (mapped?.[1]) return mapped[1]
  if (!ip.includes(':')) return ip

  // Expand "::" so every address has 8 groups, then keep the first 4.
  const [head = '', tail = ''] = ip.split('::')
  const headParts = head ? head.split(':') : []
  const tailParts = tail ? tail.split(':') : []
  const groups = ip.includes('::')
    ? [...headParts, ...Array<string>(IPV6_GROUPS - headParts.length - tailParts.length).fill('0'), ...tailParts]
    : headParts
  const prefix = groups.slice(0, IPV6_PREFIX_GROUPS).map(g => g.toLowerCase().replace(/^0+(?=.)/, ''))
  return `${prefix.join(':')}::/64`
}

/**
 * Counts one hit against `key` and returns true if it's within the limit. One atomic
 * upsert per hit: a new window starts once the previous one has expired.
 */
export async function hitRateLimit(db: Db, key: string, { limit, windowMs }: RateLimit): Promise<boolean> {
  const now = Date.now()
  const row = await db.get<{ count: number }>(`
    INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT (key) DO UPDATE SET
      count    = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
    RETURNING count
  `, key, now + windowMs, now, now)
  return row !== undefined && row.count <= limit
}

/**
 * Gives back one hit, for attempts that turn out to be legitimate (a successful
 * sign-in). Counting happens up front so concurrent attempts can't all slip past the
 * limit before any is recorded; refunding afterwards means only failures use it up.
 */
export async function refundRateLimit(db: Db, key: string): Promise<void> {
  await db.run('UPDATE rate_limits SET count = MAX(count - 1, 0) WHERE key = ?', key)
}
