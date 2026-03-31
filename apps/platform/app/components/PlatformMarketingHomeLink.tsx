"use client";

import { BRAND_FULL_CAPITAL_BRIDGE_GOLD, ChromePendingNavLink } from "@cb/ui";

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
        className="cb-header-chrome-logo"
        src={BRAND_FULL_CAPITAL_BRIDGE_GOLD}
        alt=""
        width={240}
        height={40}
        fetchPriority="high"
        decoding="async"
      />
      <img
        className="cb-header-chrome-lion-mobile"
        src="/brand/lionhead_Gold.svg"
        alt=""
        width={32}
        height={32}
        decoding="async"
      />
    </ChromePendingNavLink>
  );
}
