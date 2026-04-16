import { HeaderBrandPicture } from "@cb/ui";
import { createAppServerClient } from "@cb/supabase/server";
import { MARKETING_SITE_URL } from "@cb/shared/urls";
import { PlatformLoginButton } from "./PlatformLoginButton";
import { PlatformHeaderAuthCluster } from "./PlatformHeaderAuthCluster";
import { PlatformMarketingHomeLink } from "./PlatformMarketingHomeLink";
import { PlatformHeaderBackButton } from "./PlatformHeaderBackButton";

function marketingHomeUrl(): string {
  const base = MARKETING_SITE_URL.replace(/\/+$/, "");
  return `${base}/`;
}

export type PlatformFrameworkHeaderProps = {
  /**
   * When the parent route already verified auth (e.g. `getServerUserAndMembership`),
   * render the bar even if `getUser()` is empty in this nested RSC (defensive).
   */
  verifiedUserEmail?: string | null;
  /** When set (e.g. from `getServerUserAndMembership`), skips a duplicate `profiles` read. */
  profileNames?: { firstName: string | null; lastName: string | null };
  /** Logged-out framework landing: same chrome with Login instead of Logout. */
  publicBrowse?: boolean;
  /** Center label in the sticky bar (default: Framework). */
  centerTitle?: string;
  /** Show BACK in the right cluster (before profile / LOGOUT), matching model-app chrome — e.g. `/solutions`. */
  showBackBeforeHome?: boolean;
  /** Used when history is empty (direct navigation). Default `/framework` → `/`. */
  backFallbackHref?: string;
  /** When set with `showBackBeforeHome`, BACK always navigates here (e.g. `/profile` → `/`). */
  backPushHref?: string;
  /** Optional accessible name for BACK (e.g. profile home navigation). */
  backAriaLabel?: string;
  /** Active `plans.slug` — shows a **TRIAL** pill when `"trial"` (same cue as model-app headers). */
  membershipPlanSlug?: string | null;
};

/** Sticky bar: logo (marketing) | Framework | Logout (auth) or Login (public). */
export async function PlatformFrameworkHeader({
  verifiedUserEmail,
  profileNames,
  publicBrowse = false,
  centerTitle = "Framework",
  showBackBeforeHome = false,
  backFallbackHref = "/framework",
  backPushHref,
  backAriaLabel,
  membershipPlanSlug = null,
}: PlatformFrameworkHeaderProps = {}) {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (publicBrowse) {
    const home = marketingHomeUrl();
    return (
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
          borderBottom: "1px solid rgba(255, 204, 106, 0.22)",
          backgroundColor: "#0D3A1D",
        }}
      >
        <div
          className="platform-framework-header-inner platform-framework-header-inner--public"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(4.5rem, 1fr)",
            alignItems: "center",
            columnGap: "clamp(16px, 2vw, 32px)",
            minHeight: 54,
            maxWidth: 1280,
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          <a
            href={home}
            className="cb-header-chrome-home"
            aria-label="Capital Bridge home"
            style={{
              justifySelf: "start",
              display: "flex",
              alignItems: "center",
              minWidth: "min-content",
              flexShrink: 0,
            }}
          >
            <HeaderBrandPicture />
          </a>

          <span className="cb-header-chrome-title">Framework</span>

          <PlatformLoginButton href="/login" />
        </div>
      </header>
    );
  }

  if (!user && !verifiedUserEmail) return null;

  const home = marketingHomeUrl();
  const showTrialPill = membershipPlanSlug === "trial";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        borderBottom: "1px solid rgba(255, 204, 106, 0.22)",
        backgroundColor: "#0D3A1D",
      }}
    >
      <div
        className="platform-framework-header-inner platform-framework-header-inner--authed"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(4.5rem, 1fr)",
          alignItems: "center",
          columnGap: "clamp(16px, 2vw, 32px)",
          minHeight: 48,
          maxWidth: 1280,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <PlatformMarketingHomeLink href={home} />

        <span className="cb-header-chrome-title">{centerTitle}</span>

        <div className="platform-header-right-cluster">
          {showBackBeforeHome ? (
            <PlatformHeaderBackButton
              fallbackHref={backFallbackHref}
              pushHref={backPushHref}
              ariaLabel={backAriaLabel}
            />
          ) : null}
          {showTrialPill ? (
            <span className="platform-header-trial-badge" title="Trial plan">
              TRIAL
            </span>
          ) : null}
          <PlatformHeaderAuthCluster />
        </div>
      </div>
    </header>
  );
}
