
import React, { useState, useEffect } from 'react';
import { formatNumberWithCommas } from '../utils/formatters';

interface SliderInputProps {
  label: string;
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

  // Sync internal state when prop changes from outside (e.g., slider move)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatNumberWithCommas(value));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '' || !isNaN(Number(rawValue))) {
      setInputValue(e.target.value);
      if (rawValue !== '') {
        onChange(Number(rawValue));
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setInputValue(formatNumberWithCommas(value));
  };

  const handleFocus = () => {
    setIsFocused(true);
    // When focused, show raw number for easier editing
    setInputValue(value.toString());
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-3">
        <label className="text-[10px] sm:text-xs font-semibold text-gray-300 uppercase tracking-wider leading-tight max-w-[200px] whitespace-pre-line">
          {label}
        </label>
        <div className="flex items-center bg-[#164d2a] rounded-lg px-3 py-1.5 border border-[#FFCC6A]/30 transition-all focus-within:border-[#FFCC6A] w-full xs:w-auto">
          <span className="text-[#FFCC6A] mr-1 text-sm font-bold">{prefix}</span>
          <input
            type="text"
            value={inputValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleInputChange}
            className="bg-transparent text-right outline-none flex-1 xs:w-28 text-white font-black text-sm"
          />
          <span className="text-gray-400 ml-1 text-xs font-bold">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg cursor-pointer bg-emerald-900 appearance-none accent-[#FFCC6A]"
      />
      <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-medium">
        <span>{prefix}{formatNumberWithCommas(min)}{unit}</span>
        <span>{prefix}{formatNumberWithCommas(max)}{unit}</span>
      </div>
    </div>
  );
};

export default SliderInput;
