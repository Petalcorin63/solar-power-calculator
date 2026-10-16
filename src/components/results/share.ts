/** Small arithmetic the result tiles share. */

/** Production as a percentage of yearly use; 0 when no use is entered (instead of Infinity). */
export function percentOfUse(productionKwh: number, annualUsageKwh: number): number {
  return annualUsageKwh > 0 ? (productionKwh / annualUsageKwh) * 100 : 0
}
