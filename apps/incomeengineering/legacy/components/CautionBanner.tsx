import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CautionBannerProps {
  message: string;
  visible: boolean;
}

export const CautionBanner: React.FC<CautionBannerProps> = ({ message, visible }) => {
  if (!visible) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-[#FFCC6A]/50 bg-[#FFCC6A]/10 p-4 text-sm text-[#F6F5F1]"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-[#FFCC6A]" aria-hidden />
      <p>{message}</p>
    </div>
  );
};
