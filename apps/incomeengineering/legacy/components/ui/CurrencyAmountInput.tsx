import React from 'react';
import { NumberInput } from './NumberInput';
import type { CurrencyCode } from '../../config/currency';

const wrapperClass =
  'flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-[#FFCC6A]/25 bg-[#0A2E18] pl-3 pr-3 py-2 focus-within:ring-2 focus-within:ring-[#FFCC6A]/50 focus-within:border-[#FFCC6A]/60 transition-colors touch-manipulation';

const inputInnerClass =
  'min-h-[40px] flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#F6F5F1] focus:ring-0 focus:outline-none touch-manipulation';

interface CurrencyAmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency: CurrencyCode | string;
  min?: number;
  max?: number;
  ariaLabel?: string;
}

export function CurrencyAmountInput({
  value,
  onChange,
  currency,
  min,
  max,
  ariaLabel,
}: CurrencyAmountInputProps) {
  const prefix = currency === "RM" ? "RM" : String(currency);
  return (
    <div className={wrapperClass}>
      <span className="text-sm text-[#F6F5F1] shrink-0">{prefix}</span>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        inputMode="numeric"
        aria-label={ariaLabel}
        className={inputInnerClass}
      />
    </div>
  );
}
