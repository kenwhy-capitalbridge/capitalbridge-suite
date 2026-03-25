"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

/** Logo + "Exit Login" — main marketing site (default https://thecapitalbridge.com/) */
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? "https://thecapitalbridge.com";

/** Routes that show only "Login" (link to /access) */
const BACK_TO_LOGIN_NAV_PATHS = new Set(["/pricing", "/checkout"]);

export default function Header() {
  const pathname = usePathname();
  const isPricing = pathname === "/pricing";
  const showBackToLoginNav = pathname != null && BACK_TO_LOGIN_NAV_PATHS.has(pathname);

  const navTextLinkClass =
    "whitespace-nowrap text-[9px] font-medium text-cb-gold underline-offset-2 transition hover:text-cb-gold hover:underline max-[380px]:text-[8px] sm:text-sm";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cb-gold/20 bg-[#0D3A1D]">
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-between gap-1 px-1.5 sm:h-14 sm:gap-3 sm:px-6">
        {/* Logo: compact on mobile so nav fits one row */}
        <a
          href={MARKETING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex min-w-0 max-w-[42%] shrink items-center sm:max-w-none sm:h-9"
        >
          <Image
            src="/logo-capital-bridge.png"
            alt="Capital Bridge — Strength Behind Every Structure"
            width={200}
            height={36}
            className="h-4 w-auto max-w-full object-contain object-left [mix-blend-mode:lighten] sm:h-9"
            priority
          />
        </a>

        {isPricing && (
          <span className="min-w-0 shrink font-serif text-[9px] font-semibold uppercase tracking-wide text-cb-gold sm:text-lg sm:normal-case sm:tracking-normal">
            <span className="sm:hidden">Plans</span>
            <span className="hidden sm:inline">SELECT PLAN</span>
          </span>
        )}

        {showBackToLoginNav ? (
          <div className="flex max-w-[52%] shrink-0 items-center text-cb-gold sm:max-w-none">
            <a href="/access" className={navTextLinkClass}>
              <span className="sm:hidden">← Login</span>
              <span className="hidden sm:inline">Login</span>
            </a>
          </div>
        ) : (
          <div className="flex max-w-[52%] shrink-0 items-center text-cb-gold sm:max-w-none">
            <a href={MARKETING_URL} className={navTextLinkClass}>
              <span className="sm:hidden">← Exit</span>
              <span className="hidden sm:inline">← Exit Login</span>
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
