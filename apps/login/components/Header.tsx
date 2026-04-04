"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PLATFORM_APP_URL,
  PRICING_RETURN_MODEL_QUERY,
  pricingReturnModelDashboardUrl,
} from "@cb/shared/urls";
import { ChromePendingNavLink, HeaderBrandPicture } from "@cb/ui";
import { BRAND_LIONHEAD_GOLD } from "@cb/ui/brandPaths";

/** Logo + exit link to marketing site (default https://thecapitalbridge.com/) */
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL ?? "https://thecapitalbridge.com";

const platformProfileHref = `${PLATFORM_APP_URL.replace(/\/+$/, "")}/profile`;

/** Gold header actions — same as platform LOGOUT (`packages/ui/cb-model-base.css` `.pf-chrome-gold-btn`). */
const headerGoldBtnClass = "pf-chrome-gold-btn pf-chrome-gold-btn--header-inline shrink-0";

const cbHeaderTextLinkClass =
  "login-header-text-link whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.06em] text-[#FFCC6A] underline-offset-2 transition-colors hover:text-[#F6F5F1] min-[380px]:text-[10px] sm:text-xs sm:tracking-wide";

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

  /** Mobile: compact lion only (`/brand/lionhead_Gold.svg`); md+: full `HeaderBrandPicture`. */
  const logoClassName = pricingStyleGrid
    ? "relative flex h-7 w-7 shrink-0 items-center justify-self-start md:h-auto md:w-auto md:max-w-[34%] min-[400px]:md:max-w-[40%] sm:max-w-none"
    : "relative flex h-7 w-7 shrink-0 items-center md:h-auto md:w-auto md:max-w-[42%] sm:max-w-none";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#FFCC6A]/20 bg-[#0D3A1D] pt-[env(safe-area-inset-top)]">
      <div
        className={
          pricingStyleGrid
            ? "login-header-pricing-grid mx-auto grid min-h-11 max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-1.5 py-1 sm:min-h-0 sm:h-14 sm:gap-3 sm:px-6 sm:py-0"
            : "mx-auto flex min-h-11 max-w-6xl items-center justify-between gap-1.5 px-2 py-1 sm:min-h-0 sm:h-14 sm:gap-3 sm:px-6 sm:py-0"
        }
      >
        <ChromePendingNavLink
          href={MARKETING_URL}
          className={`cb-header-chrome-home ${logoClassName}`}
          ariaLabel="Capital Bridge home"
        >
          <img
            src={BRAND_LIONHEAD_GOLD}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain md:hidden"
            aria-hidden
          />
          <span className="hidden md:contents">
            <HeaderBrandPicture />
          </span>
        </ChromePendingNavLink>

        {pricingStyleGrid ? (
          <span className="login-header-pricing-title cb-header-chrome-title justify-self-center self-center min-w-0 max-w-full truncate px-0.5 text-center">
            {isPlansBrowse ? "AVAILABLE PLANS" : "SELECT PLANS"}
          </span>
        ) : null}

        {showPricingModelBack && pricingBackHref ? (
          <div className="login-header-pricing-actions flex shrink-0 flex-nowrap items-center justify-end gap-1 justify-self-end overflow-visible sm:gap-2">
            <ChromePendingNavLink href={pricingBackHref} className={headerGoldBtnClass}>
              BACK
            </ChromePendingNavLink>
          </div>
        ) : null}

        {showLoginCluster && !isPlansBrowse ? (
          <div
            className={
              pricingStyleGrid
                ? "login-header-pricing-actions flex shrink-0 flex-nowrap items-center justify-end gap-1 justify-self-end overflow-visible sm:gap-2"
                : "flex max-w-[52%] shrink-0 flex-nowrap items-center justify-end gap-1.5 overflow-visible text-[#FFCC6A] sm:max-w-none sm:gap-2"
            }
          >
            <ChromePendingNavLink href="/access" className={headerGoldBtnClass}>
              LOGIN
            </ChromePendingNavLink>
            <span className="shrink-0 text-[#FFCC6A]/70 max-[380px]:text-[9px] sm:text-xs" aria-hidden>
              |
            </span>
            <a href={MARKETING_URL} className={cbHeaderTextLinkClass}>
              HOMEPAGE
            </a>
          </div>
        ) : null}

        {isPlansBrowse ? (
          <div className="login-header-pricing-actions flex shrink-0 flex-nowrap items-center justify-end gap-1 justify-self-end overflow-visible sm:gap-2">
            <ChromePendingNavLink href={platformProfileHref} className={headerGoldBtnClass}>
              BACK
            </ChromePendingNavLink>
            <span className="shrink-0 text-[#FFCC6A]/70 max-[380px]:text-[9px] sm:text-xs" aria-hidden>
              |
            </span>
            <ChromePendingNavLink href={MARKETING_URL} className={cbHeaderTextLinkClass}>
              HOMEPAGE
            </ChromePendingNavLink>
          </div>
        ) : null}

        {!showLoginCluster && !isPlansBrowse && !showPricingModelBack ? (
          <div className="flex max-w-[52%] shrink-0 items-center text-[#FFCC6A] sm:max-w-none">
            <ChromePendingNavLink
              href={MARKETING_URL}
              className={`${cbHeaderTextLinkClass} normal-case sm:uppercase`}
            >
              <span className="sm:hidden">← Exit</span>
              <span className="hidden sm:inline">← Exit login</span>
            </ChromePendingNavLink>
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
