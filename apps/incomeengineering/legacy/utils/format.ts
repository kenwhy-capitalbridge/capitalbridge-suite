import type { CurrencyCode } from '../config/currency';

/**
 * Format number with commas for legibility (e.g. "125,000").
 * No currency symbol; use formatCurrency for full display.
 */
export function formatWithCommas(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(value));
}

/**
 * Format number with commas and optional decimals (e.g. "1,234.56").
 * Use for display in inputs that allow decimals (rates, percentages).
 */
export function formatNumberWithCommas(value: number, decimals?: number): string {
  if (value === 0) return '0';
  const d = decimals ?? 2;
  const parts = Number(value).toFixed(d).split('.');
  parts[0] = new Intl.NumberFormat('en-US').format(Number(parts[0]));
  return d > 0 ? parts.join('.') : parts[0];
}

/**
 * Format as currency: symbol + comma-formatted number (e.g. "RM 125,000").
 */
export function formatCurrency(value: number, currency: CurrencyCode): string {
  const symbol = currency === 'RM' ? 'RM' : currency;
  return `${symbol} ${formatWithCommas(value)}`;
}

/**
 * Format percentage (e.g. "7.5%").
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${Number(value).toFixed(decimals)}%`;
}
