/**
 * Indices for plotting `monthlySnapshots` in the UI chart.
 * Always includes month 0 and the final month so the path reaches the full horizon.
 */

export function downsampleSnapshotIndices(length: number, maxPoints = 96): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const step = Math.max(1, Math.ceil(length / maxPoints));
  const out: number[] = [];
  for (let i = 0; i < length; i += step) out.push(i);
  if (out[out.length - 1] !== length - 1) out.push(length - 1);
  return [...new Set(out)].sort((a, b) => a - b);
}
