"use client";

/**
 * Full navigation to the advisory platform (not client-side routing).
 * Shows a spinner after click until the next page loads.
 */
import { ChromePendingNavLink } from "./ChromePendingNavLink";

export function ModelAppHeaderBackButton({ href }: { href: string }) {
  return (
    <ChromePendingNavLink
      href={href}
      className="pf-chrome-gold-btn pf-chrome-gold-btn--header-inline shrink-0"
      ariaLabel="Back to Capital Bridge platform"
    >
      BACK
    </ChromePendingNavLink>
  );
}
