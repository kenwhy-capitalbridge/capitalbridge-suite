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
    "inline-flex min-h-[36px] min-w-[3.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-cb-gold/85 bg-cb-gold/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-cb-gold transition hover:bg-cb-gold/30 hover:text-cb-cream active:bg-cb-gold/40 sm:min-h-0 sm:min-w-0 sm:rounded-full sm:px-4 sm:py-1.5 sm:text-xs";

  const logoClassName = pricingHeaderGrid
    ? "relative flex min-w-0 max-w-[34%] shrink items-center justify-self-start min-[400px]:max-w-[40%] sm:max-w-none sm:h-9"
    : "relative flex min-w-0 max-w-[42%] shrink items-center sm:max-w-none sm:h-9";

  const logoImageClassName = pricingHeaderGrid
    ? "h-[15px] w-auto max-w-full object-contain object-left [mix-blend-mode:lighten] min-[400px]:h-4 sm:h-9"
    : "h-4 w-auto max-w-full object-contain object-left [mix-blend-mode:lighten] sm:h-9";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cb-gold/20 bg-[#0D3A1D] pt-[env(safe-area-inset-top)]">
      <div
        className={
          pricingHeaderGrid
            ? "mx-auto grid min-h-11 max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-2 py-1 sm:min-h-0 sm:h-14 sm:gap-3 sm:px-6 sm:py-0"
            : "mx-auto flex min-h-11 max-w-6xl items-center justify-between gap-1 px-2 py-1 sm:min-h-0 sm:h-14 sm:gap-3 sm:px-6 sm:py-0"
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
            className={logoImageClassName}
            priority
          />
        </a>

        {pricingHeaderGrid && (
          <span className="pointer-events-none whitespace-nowrap text-center font-serif text-[7px] font-semibold uppercase leading-none tracking-[0.05em] text-cb-gold min-[360px]:text-[8px] min-[400px]:text-[9px] sm:text-lg sm:leading-normal sm:tracking-normal">
            SELECT PLAN
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
