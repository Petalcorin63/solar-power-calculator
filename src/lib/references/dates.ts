/** Date formatting for the references list. */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Formats an ISO date (YYYY-MM-DD) as e.g. "4 October 2026", independent of the viewer's locale. */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  const monthName = match ? MONTHS[Number(match[2]) - 1] : undefined
  if (!match || !monthName) throw new Error(`Not an ISO date: ${iso}`)
  return `${Number(match[3])} ${monthName} ${match[1]}`
}
