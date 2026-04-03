import { formatCurrencyDisplayNoDecimals } from "@cb/shared/formatCurrency";

export const formatCurrency = (value: number, prefix: string = "RM"): string =>
  formatCurrencyDisplayNoDecimals(value, prefix);

export const formatNumberWithCommas = (value: number): string => {
  return new Intl.NumberFormat("en-MY").format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
