import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  id?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, id }) => {
  const [show, setShow] = useState(false);
  const tipId = id || `tip-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <span className="relative inline-flex items-center">
      <span
        aria-describedby={show ? tipId : undefined}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="cursor-help border-b border-dotted border-[#B8B5AE]"
      >
        {children}
      </span>
      {show && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 max-w-xs rounded-lg bg-[#0A2E18] px-2 py-1.5 text-xs text-[#F6F5F1] shadow-lg border border-[#FFCC6A]/30"
        >
          {text}
        </span>
      )}
    </span>
  );
};
