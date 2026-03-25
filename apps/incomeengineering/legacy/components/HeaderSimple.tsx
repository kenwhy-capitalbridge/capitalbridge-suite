import React from 'react';

const CAPITAL_BRIDGE_URL = 'https://thecapitalbridge.com/advisory-platform/';

const HEADER_BG = '#0C3A1C';

export const HeaderSimple: React.FC = () => (
  <header
    className="fixed left-0 right-0 top-0 z-50 w-full border-b border-[#1A4D2E] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur supports-[backdrop-filter]:bg-[#0C3A1C]/90"
    role="banner"
    style={{ backgroundColor: `${HEADER_BG}F2` }}
  >
    <div className="mx-auto grid h-14 min-h-[44px] max-w-6xl grid-cols-3 items-center gap-2 px-3 sm:gap-4 sm:px-4">
      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
        <img
          src="/capital-bridge-logo-header.png"
          alt="Capital Bridge — Strength Behind Every Structure"
          className="h-6 w-auto max-w-[100px] shrink-0 object-contain object-left sm:h-9 sm:max-w-[160px] md:h-10 md:max-w-[180px]"
          style={{ mixBlendMode: 'lighten' }}
          width={180}
          height={40}
        />
      </div>
      <div className="flex justify-center">
        <span className="text-[10px] font-medium uppercase tracking-wide text-white sm:hidden">
          Capital Engineering
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-wide text-white sm:inline sm:text-xs">
          Capital Engineering Model
        </span>
      </div>
      <div className="flex justify-end">
        <a
          href={CAPITAL_BRIDGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium text-[#F6F5F1]/90 underline-offset-2 hover:text-[#FFCC6A] hover:underline focus:outline-none focus:ring-2 focus:ring-[#FFCC6A]/50 focus:ring-offset-2 focus:ring-offset-[#0C3A1C]"
        >
          ← Exit Model
        </a>
      </div>
    </div>
  </header>
);
