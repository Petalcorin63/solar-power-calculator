/** Numeric guards shared by the calculation domains. */

/** Treats blank, NaN, infinite or negative inputs as 0 so bad form input can't poison results. */
export function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}
