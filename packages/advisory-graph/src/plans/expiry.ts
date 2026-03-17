/**
 * Pure expiry computation: start date + N days (timezone-agnostic UTC day math).
 */

/**
 * Returns a new Date at start of day (UTC) plus `days` full days.
 * Used for membership expires_at. Timezone-agnostic: uses UTC.
 */
export function computeExpiry(startsAt: Date, days: number): Date {
  const start = new Date(startsAt.getTime());
  const result = new Date(start);
  result.setUTCDate(result.getUTCDate() + Math.floor(days));
  return result;
}
