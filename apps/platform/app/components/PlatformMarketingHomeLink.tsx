"use client";

import { ChromePendingNavLink, HeaderBrandPicture } from "@cb/ui";

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
        minWidth: "min-content",
      }}
    >
      <HeaderBrandPicture />
    </ChromePendingNavLink>
  );
}
