"use client";

import {
  BRAND_CAPITAL_BRIDGE_LOGO_GOLD,
  BRAND_FULL_CAPITAL_BRIDGE_GOLD,
  BRAND_LIONHEAD_GOLD,
  ChromePendingNavLink,
} from "@cb/ui";

/** Marketing home logo strip — same pending + spinner behaviour as login / model headers. */
export function PlatformMarketingHomeLink({ href }: { href: string }) {
  return (
    <ChromePendingNavLink
      href={href}
      className="cb-header-chrome-home"
      ariaLabel="Capital Bridge home"
      style={{
        justifySelf: "start",
        display: "flex",
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <img
        className="cb-header-chrome-logo-full"
        src={BRAND_FULL_CAPITAL_BRIDGE_GOLD}
        alt=""
        width={280}
        height={48}
        fetchPriority="high"
        decoding="async"
      />
      <img
        className="cb-header-chrome-logo-wordmark"
        src={BRAND_CAPITAL_BRIDGE_LOGO_GOLD}
        alt=""
        width={220}
        height={44}
        decoding="async"
      />
      <img
        className="cb-header-chrome-lion-mobile"
        src={BRAND_LIONHEAD_GOLD}
        alt=""
        width={48}
        height={48}
        decoding="async"
      />
    </ChromePendingNavLink>
  );
}
