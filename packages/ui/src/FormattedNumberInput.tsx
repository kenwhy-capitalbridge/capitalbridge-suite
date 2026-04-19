"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

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

/** Group integer part of a raw digit string; preserve optional fractional tail while typing. */
function formatRawWithCommas(raw: string, allowDecimals: boolean): string {
  const stripped = raw.replace(/,/g, "");
  if (stripped === "" || stripped === ".") return stripped;
  if (allowDecimals && stripped.includes(".")) {
    const [intPart, decPart] = stripped.split(".");
    const formattedInt =
      intPart === "" ? "" : new Intl.NumberFormat("en-US").format(parseInt(intPart || "0", 10));
    return decPart === undefined ? formattedInt : `${formattedInt}.${decPart}`;
  }
  const num = parseInt(stripped, 10);
  if (!Number.isFinite(num)) return stripped;
  return new Intl.NumberFormat("en-US").format(num);
}

function parseDisplayValue(raw: string, allowDecimals: boolean): number {
  const stripped = raw.replace(/,/g, "");
  if (stripped === "" || stripped === ".") return 0;
  const n = allowDecimals ? parseFloat(stripped) : parseInt(stripped, 10);
  return Number.isFinite(n) ? n : 0;
}

function positionAfterNDigits(formatted: string, n: number): number {
  let digits = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (digits === n) return i;
    if (/\d/.test(formatted[i])) digits++;
  }
  return formatted.length;
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
};

/**
 * Text input with thousand separators; keeps a stable draft while focused so values like
 * `3.0` can be edited without the decimal disappearing (controlled `number` + `toLocaleString` bug).
 */
export function FormattedNumberInput({
  value,
  onChange,
  allowDecimals = false,
  decimalPlaces = 2,
  min,
  max,
  emptyWhenZero = false,
  className = "",
  ...rest
}: FormattedNumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [localRaw, setLocalRaw] = useState("");
  const digitsBeforeCursorRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = useCallback(
    (n: number) => {
      let v = n;
      if (min !== undefined && min !== null) v = Math.max(min, v);
      if (max !== undefined && max !== null) v = Math.min(max, v);
      return v;
    },
    [min, max],
  );

  const formattedFromRaw = formatRawWithCommas(localRaw, allowDecimals);
  const displayValue = focused
    ? localRaw === "" && value === 0
      ? ""
      : formattedFromRaw || "0"
    : emptyWhenZero && value === 0
      ? ""
      : allowDecimals
        ? formatNumberWithDecimals(value, decimalPlaces)
        : formatWithCommasInteger(value);

  useEffect(() => {
    if (focused && inputRef.current && document.activeElement === inputRef.current) {
      const pos = positionAfterNDigits(displayValue, digitsBeforeCursorRef.current);
      inputRef.current.setSelectionRange(pos, pos);
    }
  }, [displayValue, focused]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    const raw = value === 0 ? "" : allowDecimals ? String(value) : String(Math.round(value));
    setLocalRaw(raw);
    digitsBeforeCursorRef.current = (raw.replace(/,/g, "").match(/\d/g) || []).length;
  }, [value, allowDecimals]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const parsed = parseDisplayValue(localRaw || String(value), allowDecimals);
    const clamped = clamp(parsed);
    if (clamped !== value) onChange(clamped);
    setLocalRaw("");
  }, [localRaw, value, allowDecimals, onChange, clamp]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const raw = input.value.replace(/,/g, "");
      const digitsBeforeCursor = (input.value.slice(0, input.selectionStart ?? 0).match(/\d/g) || []).length;

      if (allowDecimals) {
        if (raw === "" || raw === "." || /^\d*\.?\d*$/.test(raw)) {
          setLocalRaw(raw);
          digitsBeforeCursorRef.current = digitsBeforeCursor;
          const n = clamp(parseDisplayValue(raw, true));
          onChange(n);
        }
      } else if (raw === "" || /^\d+$/.test(raw)) {
        setLocalRaw(raw);
        digitsBeforeCursorRef.current = digitsBeforeCursor;
        const n = clamp(parseDisplayValue(raw, false));
        onChange(n);
      }
    },
    [allowDecimals, onChange, clamp],
  );

  return (
    <input
      {...rest}
      ref={inputRef}
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
