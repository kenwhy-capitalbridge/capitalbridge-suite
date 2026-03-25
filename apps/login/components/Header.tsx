"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

/** Logo + "Exit Login" — main marketing site (default https://thecapitalbridge.com/) */
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? "https://thecapitalbridge.com";

/** Routes that show LOGIN → /access (not marketing exit link) */
const BACK_TO_LOGIN_NAV_PATHS = new Set(["/pricing", "/checkout"]);

export default function Header() {
  const pathname = usePathname();
  const isPricing = pathname === "/pricing";
  const showBackToLoginNav = pathname != null && BACK_TO_LOGIN_NAV_PATHS.has(pathname);
  /** Equal 1fr | auto | 1fr so the middle column sits on the true horizontal center */
  const pricingHeaderGrid =
    isPricing && showBackToLoginNav;

  const navTextLinkClass =
    "whitespace-nowrap text-[9px] font-medium text-cb-gold underline-offset-2 transition hover:text-cb-gold hover:underline max-[380px]:text-[8px] sm:text-sm";

  const loginButtonClass =
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded border border-cb-gold/85 bg-cb-gold/15 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-cb-gold transition hover:bg-cb-gold/30 hover:text-cb-cream max-[380px]:px-1.5 max-[380px]:text-[7px] sm:rounded-full sm:px-4 sm:py-1.5 sm:text-xs";

  const logoClassName = pricingHeaderGrid
    ? "relative flex min-w-0 shrink items-center justify-self-start sm:h-9"
    : "relative flex min-w-0 max-w-[42%] shrink items-center sm:max-w-none sm:h-9";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cb-gold/20 bg-[#0D3A1D]">
      <div
        className={
          pricingHeaderGrid
            ? "mx-auto grid h-9 max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-1.5 sm:h-14 sm:gap-3 sm:px-6"
            : "mx-auto flex h-9 max-w-6xl items-center justify-between gap-1 px-1.5 sm:h-14 sm:gap-3 sm:px-6"
        }
      >
        <a
          href={MARKETING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={logoClassName}
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

        {pricingHeaderGrid && (
          <span className="pointer-events-none text-center font-serif text-[9px] font-semibold uppercase tracking-wide text-cb-gold sm:text-lg sm:tracking-normal">
            <span className="sm:hidden">Plans</span>
            <span className="hidden sm:inline">SELECT PLAN</span>
          </span>
        )}

        {showBackToLoginNav ? (
          <div
            className={
              pricingHeaderGrid
                ? "flex justify-self-end"
                : "flex max-w-[52%] shrink-0 items-center justify-end text-cb-gold sm:max-w-none"
            }
          >
            <a href="/access" className={loginButtonClass}>
              LOGIN
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
