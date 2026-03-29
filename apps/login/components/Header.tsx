"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PLATFORM_APP_URL,
  PRICING_RETURN_MODEL_QUERY,
  pricingReturnModelDashboardUrl,
} from "@cb/shared/urls";

/** Logo + exit link to marketing site (default https://thecapitalbridge.com/) */
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? "https://thecapitalbridge.com";

const platformProfileHref = `${PLATFORM_APP_URL.replace(/\/+$/, "")}/profile`;

/** Gold header actions — same as platform LOGOUT (`packages/ui/cb-model-base.css` `.pf-chrome-gold-btn`). */
const headerGoldBtnClass = "pf-chrome-gold-btn pf-chrome-gold-btn--header-inline shrink-0";

const cbHeaderTextLinkClass =
  "whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-[#FFCC6A] underline-offset-2 transition-colors hover:text-[#F6F5F1] sm:text-xs";

function HeaderChrome({
  pathname,
  pricingBackHref,
}: {
  pathname: string | null;
  pricingBackHref: string | null;
}) {
  const isPricing = pathname === "/pricing";
  const isPlansBrowse = pathname === "/plans";
  const isCheckout = pathname === "/checkout";
  const pricingStyleGrid = isPricing || isPlansBrowse;
  const showPricingModelBack = Boolean(isPricing && pricingBackHref);
  const showLoginCluster = (isPricing && !showPricingModelBack) || isCheckout;

  const logoClassName = pricingStyleGrid
    ? "relative flex min-w-0 max-w-[34%] shrink items-center justify-self-start min-[400px]:max-w-[40%] sm:max-w-none"
    : "relative flex min-w-0 max-w-[42%] shrink items-center sm:max-w-none";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#FFCC6A]/20 bg-[#0D3A1D] pt-[env(safe-area-inset-top)]">
      <div
        className={
          pricingStyleGrid
            ? "mx-auto grid min-h-11 max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-2 py-1 sm:min-h-0 sm:h-14 sm:gap-3 sm:px-6 sm:py-0"
            : "mx-auto flex min-h-11 max-w-6xl items-center justify-between gap-1 px-2 py-1 sm:min-h-0 sm:h-14 sm:gap-3 sm:px-6 sm:py-0"
        }
      >
        <a href={MARKETING_URL} className={logoClassName}>
          <img
            src="/brand/CapitalBridgeLogo_Gold.svg"
            alt="Capital Bridge — Strength Behind Every Structure"
            width={200}
            height={40}
            className="cb-header-chrome-logo max-w-full"
            fetchPriority="high"
            decoding="async"
          />
        </a>

        {pricingStyleGrid ? (
          <span className="cb-header-chrome-title justify-self-center min-w-0 max-w-full truncate">
            {isPlansBrowse ? "AVAILABLE PLANS" : "SELECT PLANS"}
          </span>
        ) : null}

        {showPricingModelBack && pricingBackHref ? (
          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 justify-self-end overflow-visible sm:gap-2">
            <a href={pricingBackHref} className={headerGoldBtnClass}>
              BACK
            </a>
          </div>
        ) : null}

        {showLoginCluster && !isPlansBrowse ? (
          <div
            className={
              pricingStyleGrid
                ? "flex shrink-0 flex-nowrap items-center justify-end gap-1.5 justify-self-end overflow-visible sm:gap-2"
                : "flex max-w-[52%] shrink-0 flex-nowrap items-center justify-end gap-1.5 overflow-visible text-[#FFCC6A] sm:max-w-none sm:gap-2"
            }
          >
            <a href="/access" className={headerGoldBtnClass}>
              LOGIN
            </a>
            <span className="shrink-0 text-[#FFCC6A]/70 max-[380px]:text-[9px] sm:text-xs" aria-hidden>
              |
            </span>
            <a href={MARKETING_URL} className={cbHeaderTextLinkClass}>
              HOMEPAGE
            </a>
          </div>
        ) : null}

        {isPlansBrowse ? (
          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 justify-self-end overflow-visible sm:gap-2">
            <a href={platformProfileHref} className={headerGoldBtnClass}>
              BACK
            </a>
            <span className="shrink-0 text-[#FFCC6A]/70 max-[380px]:text-[9px] sm:text-xs" aria-hidden>
              |
            </span>
            <a href={MARKETING_URL} className={cbHeaderTextLinkClass}>
              HOMEPAGE
            </a>
          </div>
        ) : null}

        {!showLoginCluster && !isPlansBrowse && !showPricingModelBack ? (
          <div className="flex max-w-[52%] shrink-0 items-center text-[#FFCC6A] sm:max-w-none">
            <a href={MARKETING_URL} className={`${cbHeaderTextLinkClass} normal-case sm:uppercase`}>
              <span className="sm:hidden">← Exit</span>
              <span className="hidden sm:inline">← Exit login</span>
            </a>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function HeaderWithSearchParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get(PRICING_RETURN_MODEL_QUERY);
  const pricingBackHref =
    pathname === "/pricing" && raw ? pricingReturnModelDashboardUrl(raw) : null;
  return <HeaderChrome pathname={pathname} pricingBackHref={pricingBackHref} />;
}

function HeaderFallback() {
  const pathname = usePathname();
  return <HeaderChrome pathname={pathname} pricingBackHref={null} />;
}

export default function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderWithSearchParams />
    </Suspense>
  );
}
