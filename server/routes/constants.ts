/** Limits and SQL fragments shared by the route handlers. */

/** Largest single saved state; a real project is a few KB. */
export const MAX_DATA_BYTES = 200_000

/**
 * SQL condition: the user's other projects plus the new data fit the storage quota.
 * Used inside the INSERT/UPDATE itself, so concurrent saves can't each pass a separate
 * check and overshoot together. Args, in order: user id, id of the project being
 * replaced (or null for a new one), new data size in bytes, quota in bytes.
 */
export const FITS_STORAGE_QUOTA = `
  (SELECT COALESCE(SUM(length(CAST(data AS BLOB))), 0) FROM projects
   WHERE user_id = ? AND id IS NOT ?) + ? <= ?`
