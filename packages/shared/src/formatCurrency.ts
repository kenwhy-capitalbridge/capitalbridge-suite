export function formatRM(num: number | null | undefined) {
  if (num == null || !Number.isFinite(num)) return "-";
  return `RM ${num.toLocaleString("en-MY")}`;
}
