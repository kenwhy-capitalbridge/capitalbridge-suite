"use client";

import React, { useCallback, useState } from "react";

function formatWithCommasInteger(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatNumberWithDecimals(value: number, decimals: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return decimals > 0 ? `0.${"0".repeat(decimals)}` : "0";
  if (n === 0) return decimals > 0 ? `0.${"0".repeat(decimals)}` : "0";
  const parts = n.toFixed(decimals).split(".");
  parts[0] = new Intl.NumberFormat("en-US").format(Number(parts[0]));
  return decimals > 0 ? parts.join(".") : parts[0];
}

function parseDisplayValue(raw: string, allowDecimals: boolean): number {
  const stripped = raw.replace(/,/g, "");
  if (stripped === "" || stripped === ".") return 0;
  const n = allowDecimals ? parseFloat(stripped) : parseInt(stripped, 10);
  return Number.isFinite(n) ? n : 0;
}

function roundToDecimals(n: number, dp: number): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function trimTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

/** Stable string when focusing a numeric value (no grouping; trim useless fraction zeros). */
function valueToEditingString(value: number, allowDecimals: boolean, decimalPlaces: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  if (!allowDecimals) return String(Math.round(value));
  const r = roundToDecimals(value, decimalPlaces);
  return trimTrailingZeros(r.toFixed(decimalPlaces));
}

function finalizedNumeric(
  raw: string,
  allowDecimals: boolean,
  decimalPlaces: number,
  clamp: (n: number) => number,
): number {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === ".") {
    return clamp(0);
  }
  const parsed = parseDisplayValue(trimmed, allowDecimals);
  const clamped = clamp(parsed);
  if (allowDecimals) return roundToDecimals(clamped, decimalPlaces);
  return Math.round(clamped);
}

function numericChanged(a: number, b: number, allowDecimals: boolean, decimalPlaces: number): boolean {
  if (allowDecimals) {
    return Math.abs(roundToDecimals(a, decimalPlaces) - roundToDecimals(b, decimalPlaces)) > 1e-12;
  }
  return Math.round(a) !== Math.round(b);
}

export type FormattedNumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
  decimalPlaces?: number;
  min?: number;
  max?: number;
  /** When true, show an empty field (not "0") while blurred if `value` is exactly 0. */
  emptyWhenZero?: boolean;
  /**
   * When true, `onChange` runs on blur (after clamp/round) instead of every keystroke.
   * Default: same as `allowDecimals` — decimal fields commit on blur; integer/currency fields update live.
   */
  commitOnBlur?: boolean;
};

/**
 * Number input: thousand separators when blurred; while focused, shows the raw typing string
 * (no per-keystroke grouping) so decimals and caret behave naturally. Decimal fields default to
 * `commitOnBlur` so the parent state is not rewritten on each keypress.
 */
export function FormattedNumberInput({
  value,
  onChange,
  allowDecimals = false,
  decimalPlaces = 2,
  min,
  max,
  emptyWhenZero = false,
  commitOnBlur: commitOnBlurProp,
  className = "",
  ...rest
}: FormattedNumberInputProps) {
  const commitOnBlur = commitOnBlurProp ?? allowDecimals;

  const [focused, setFocused] = useState(false);
  const [localRaw, setLocalRaw] = useState("");

  const clamp = useCallback(
    (n: number) => {
      let v = n;
      if (min !== undefined && min !== null) v = Math.max(min, v);
      if (max !== undefined && max !== null) v = Math.min(max, v);
      return v;
    },
    [min, max],
  );

  const displayValue = focused
    ? localRaw === "" && value === 0
      ? ""
      : localRaw
    : emptyWhenZero && value === 0
      ? ""
      : allowDecimals
        ? formatNumberWithDecimals(value, decimalPlaces)
        : formatWithCommasInteger(value);

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (value === 0) {
      setLocalRaw("");
      return;
    }
    setLocalRaw(valueToEditingString(value, allowDecimals, decimalPlaces));
  }, [value, allowDecimals, decimalPlaces]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const next = finalizedNumeric(localRaw, allowDecimals, decimalPlaces, clamp);
    if (numericChanged(next, value, allowDecimals, decimalPlaces)) {
      onChange(next);
    }
    setLocalRaw("");
  }, [localRaw, value, allowDecimals, decimalPlaces, clamp, onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/,/g, "");

      if (allowDecimals) {
        if (raw === "" || raw === "." || /^\d*\.?\d*$/.test(raw)) {
          setLocalRaw(raw);
          if (!commitOnBlur) {
            const n = clamp(parseDisplayValue(raw, true));
            onChange(n);
          }
        }
      } else if (raw === "" || /^\d*$/.test(raw)) {
        setLocalRaw(raw);
        if (!commitOnBlur) {
          const n = clamp(parseDisplayValue(raw === "" ? "0" : raw, false));
          onChange(n);
        }
      }
    },
    [allowDecimals, commitOnBlur, onChange, clamp],
  );

  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
      aria-valuenow={value}
    />
  );
}
