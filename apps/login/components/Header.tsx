"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const EXIT_LOGIN_URL =
  process.env.NEXT_PUBLIC_EXIT_LOGIN_URL ?? "https://thecapitalbridge.com/advisory-platform/";
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? "https://thecapitalbridge.com";

export default function Header() {
  const pathname = usePathname();
  const isPricing = pathname === "/pricing";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cb-gold/20 bg-[#0D3A1D]">
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-1 px-2 sm:h-14 sm:gap-2 sm:px-6">
        {/* Logo: extra small on mobile */}
        <a
          href={MARKETING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex h-5 shrink-0 items-center transition sm:h-9"
        >
          <Image
            src="/logo-capital-bridge.png"
            alt="Capital Bridge — Strength Behind Every Structure"
            width={200}
            height={36}
            className="h-5 w-auto object-contain object-left [mix-blend-mode:lighten] sm:h-9"
            priority
          />
        </a>

        {isPricing && (
          <span className="shrink-0 font-serif text-xs font-semibold text-cb-gold sm:text-lg">
            SELECT PLAN
          </span>
        )}

        {/* Exit / back to login: extra small on mobile */}
        <a
          href={isPricing ? "/access" : EXIT_LOGIN_URL}
          className="shrink-0 rounded border border-cb-gold/50 bg-cb-gold/10 px-1 py-0.5 text-[10px] font-medium leading-tight text-cb-gold transition hover:bg-cb-gold/20 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm sm:leading-normal"
        >
          {isPricing ? "← BACK TO LOGIN" : "← EXIT LOGIN"}
        </a>
      </div>
    </header>
  );
}
