import React from 'react';
import type { SustainabilityStatus } from '../types/calculator';

interface SustainabilityBadgeProps {
  status: SustainabilityStatus;
  currency: string;
  invalidReason?: string;
}

const LABELS: Record<SustainabilityStatus, string> = {
  green: 'Sustainable',
  amber: 'Needs optimization',
  red: 'Not sustainable',
  invalid: 'Invalid scenario',
};

const STYLES: Record<SustainabilityStatus, string> = {
  green: 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/40',
  amber: 'bg-[#FFCC6A]/20 text-[#FFCC6A] border-[#FFCC6A]/40',
  red: 'bg-[#F29E38]/20 text-[#F29E38] border-[#F29E38]/40',
  invalid: 'bg-red-900/30 text-red-300 border-red-500/40',
};

export const SustainabilityBadge: React.FC<SustainabilityBadgeProps> = ({
  status,
  currency,
  invalidReason,
}) => {
  const label = status === 'invalid' && invalidReason ? `Invalid scenario – ${invalidReason}` : LABELS[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-wide ${STYLES[status]}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </span>
  );
};
