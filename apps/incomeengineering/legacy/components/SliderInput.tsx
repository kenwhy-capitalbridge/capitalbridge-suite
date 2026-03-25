import React, { useState, useEffect } from 'react';
import { formatNumberWithCommas } from '../utils/formatters';

interface SliderInputProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  prefix?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  prefix = ''
}) => {
  const [inputValue, setInputValue] = useState(formatNumberWithCommas(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatNumberWithCommas(value));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    if (rawValue === '' || !isNaN(Number(rawValue))) {
      const numValue = rawValue === '' ? 0 : Number(rawValue);
      onChange(numValue);
      setInputValue(rawValue === '' ? '' : formatNumberWithCommas(numValue));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setInputValue(formatNumberWithCommas(value));
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(value === 0 ? '' : formatNumberWithCommas(value));
  };

  return (
    <div className="mb-8 w-full transition-all group">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <label className="text-[10px] sm:text-[11px] font-black text-[#9FB8AA] uppercase tracking-[0.15em] leading-relaxed flex-1 group-hover:text-[#EAF5EF] transition-colors flex items-center gap-2">
          {label}
        </label>
        <div className="flex items-center bg-[#0B2F1E]/80 rounded-xl px-4 py-3 border border-[#2E5A45] transition-all focus-within:border-[#F6C76A] w-full sm:w-auto shadow-2xl min-w-[150px]">
          {prefix && <span className="text-[#F6C76A] mr-1.5 text-sm font-black">{prefix}</span>}
          <input
            type="text"
            value={inputValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleInputChange}
            placeholder="0"
            className="bg-transparent text-right outline-none flex-1 w-full text-[#EAF5EF] font-black text-sm sm:text-base tracking-tight-serif"
          />
          {unit && <span className="text-[#9FB8AA] ml-1.5 text-[10px] font-bold uppercase tracking-widest">{unit}</span>}
        </div>
      </div>
      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-lg cursor-pointer bg-[#0B2F1E] appearance-none accent-[#F6C76A] hover:h-2 transition-all shadow-inner"
        />
      </div>
      <div className="flex justify-between text-[9px] text-[#9FB8AA]/50 mt-2 font-bold uppercase tracking-widest italic">
        <span>{prefix}{formatNumberWithCommas(min)}{unit}</span>
        <span>{prefix}{formatNumberWithCommas(max)}{unit}</span>
      </div>
    </div>
  );
};

export default SliderInput;