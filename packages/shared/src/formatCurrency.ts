/**
 * Display-only currency formatting: prefix immediately followed by grouped integer (no space, no decimals).
 * Not for user-editable numeric inputs (those keep their own formatting).
 */

const KNOWN_CODES = [
  "MYR",
  "SGD",
  "USD",
  "AUD",
  "RMB",
  "HKD",
  "THB",
  "PHP",
  "CNY",
  "EUR",
  "GBP",
] as const;

/**
 * Map hints like "RM (MYR)", "MYR", "SGD" to a short display prefix (RM for ringgit).
 */
export function normalizeCurrencyDisplayPrefix(currencyHint?: string | null): string {
  if (currencyHint == null || !String(currencyHint).trim()) return "RM";
  const raw = String(currencyHint).trim();
  const u = raw.toUpperCase();
  if (u.includes("MYR") || u.includes("RM")) return "RM";
  if (u.includes("CNY")) return "RMB";
  for (const c of KNOWN_CODES) {
    if (c === "MYR") continue;
    if (u === c || u.startsWith(`${c} `) || u.startsWith(`${c}(`)) {
      return c;
    }
  }
  const token = raw.split(/[\s(/]/)[0] ?? "RM";
  const tu = token.toUpperCase();
  if (tu === "MYR" || tu === "RM") return "RM";
  return tu || "RM";
}

/**
 * Rounded integer amount with thousands separators; prefix touches the number (e.g. RM3,912).
 */
export function formatCurrencyDisplayNoDecimals(
  amount: number | null | undefined,
  currencyHint?: string | null,
): string {
  if (amount == null || !Number.isFinite(amount)) return "-";
  const rounded = Math.round(amount);
  const absStr = Math.abs(rounded).toLocaleString("en-MY", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  const prefix = normalizeCurrencyDisplayPrefix(currencyHint);
  if (rounded < 0) return `-${prefix}${absStr}`;
  return `${prefix}${absStr}`;
}

/** @deprecated Prefer formatCurrencyDisplayNoDecimals — kept for call sites that mean “ringgit display”. */
export function formatRM(num: number | null | undefined) {
  return formatCurrencyDisplayNoDecimals(num, "RM");
}
