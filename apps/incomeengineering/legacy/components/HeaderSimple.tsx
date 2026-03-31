import React from 'react';
import { BRAND_FULL_CAPITAL_BRIDGE_GOLD } from '@cb/ui';

const CAPITAL_BRIDGE_URL = 'https://thecapitalbridge.com/advisory-platform/';

const HEADER_BG = '#0D3A1D';

export const HeaderSimple: React.FC = () => (
  <header
    className="fixed left-0 right-0 top-0 z-50 w-full border-b border-[#FFCC6A]/25 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur supports-[backdrop-filter]:bg-[#0D3A1D]/90"
    role="banner"
    style={{ backgroundColor: `${HEADER_BG}F2` }}
  >
    <div className="mx-auto grid h-14 min-h-[44px] max-w-6xl grid-cols-3 items-center gap-2 px-3 sm:gap-4 sm:px-4">
      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
        <img
          src="/brand/lionhead_Gold.svg"
          alt=""
          className="h-7 w-auto shrink-0 object-contain object-left sm:hidden"
          width={32}
          height={32}
          decoding="async"
        />
        <img
          src={BRAND_FULL_CAPITAL_BRIDGE_GOLD}
          alt="Capital Bridge — Strength Behind Every Structure"
          className="hidden h-6 w-auto max-w-[min(42vw,220px)] shrink-0 object-contain object-left sm:block sm:h-9 md:h-10"
          width={240}
          height={40}
          decoding="async"
        />
      </div>
      <div className="flex justify-center">
        <span className="text-[10px] font-medium uppercase tracking-wide text-white sm:hidden">
          Income Engineering
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-wide text-white sm:inline sm:text-xs">
          Income Engineering Model
        </span>
      </div>
      <div className="flex justify-end">
        <a
          href={CAPITAL_BRIDGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium text-[#F6F5F1]/90 underline-offset-2 hover:text-[#FFCC6A] hover:underline focus:outline-none focus:ring-2 focus:ring-[#FFCC6A]/50 focus:ring-offset-2 focus:ring-offset-[#0D3A1D]"
        >
          ← Exit Model
        </a>
      </div>
    </div>
  </header>
);
