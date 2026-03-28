import { createAppServerClient } from "@cb/supabase/server";
import { MARKETING_SITE_URL } from "@cb/shared/urls";
import { PlatformLoginButton } from "./PlatformLoginButton";
import { PlatformHeaderAuthCluster } from "./PlatformHeaderAuthCluster";
import { initialsFromDisplayName } from "../../lib/profileInitials";

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
  /** Logged-out framework landing: same chrome with Login instead of Logout. */
  publicBrowse?: boolean;
};

/** Sticky bar: logo (marketing) | Framework | Logout (auth) or Login (public). */
export async function PlatformFrameworkHeader({
  verifiedUserEmail,
  publicBrowse = false,
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
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            alignItems: "center",
            columnGap: "0.5rem",
            minHeight: 48,
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0.3rem 0.75rem",
            boxSizing: "border-box",
          }}
        >
          <a
            href={home}
            style={{
              justifySelf: "start",
              display: "flex",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <img
              src="/brand/CapitalBridgeLogo_Gold.svg"
              alt="Capital Bridge — Strength Behind Every Structure"
              width={200}
              height={40}
              fetchPriority="high"
              decoding="async"
              style={{
                height: "clamp(18px, 4.2vw, 28px)",
                width: "auto",
                maxWidth: "min(34vw, 170px)",
                objectFit: "contain",
                objectPosition: "left center",
              }}
            />
          </a>

          <span
            style={{
              fontSize: "clamp(0.52rem, 1.9vw, 0.72rem)",
              fontWeight: 700,
              letterSpacing: "clamp(0.08em, 0.7vw, 0.2em)",
              textTransform: "uppercase",
              color: "rgba(255, 204, 106, 0.95)",
              fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            Framework
          </span>

          <PlatformLoginButton href="/login" />
        </div>
      </header>
    );
  }

  if (!user && !verifiedUserEmail) return null;

  const displayName = user
    ? (
        (user.user_metadata?.name as string | undefined)?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        null
      )
    : null;
  const emailForInitials = user?.email ?? verifiedUserEmail ?? null;
  const initials = initialsFromDisplayName(displayName, emailForInitials);

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
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          columnGap: "0.5rem",
          minHeight: 48,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0.3rem 0.75rem",
          boxSizing: "border-box",
        }}
      >
        <a
          href={home}
          style={{
            justifySelf: "start",
            display: "flex",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <img
            src="/brand/CapitalBridgeLogo_Gold.svg"
            alt="Capital Bridge — Strength Behind Every Structure"
            width={200}
            height={40}
            fetchPriority="high"
            decoding="async"
            style={{
              height: "clamp(18px, 4.2vw, 28px)",
              width: "auto",
              maxWidth: "min(34vw, 170px)",
              objectFit: "contain",
              objectPosition: "left center",
            }}
          />
        </a>

        <span
          style={{
            fontSize: "clamp(0.52rem, 1.9vw, 0.72rem)",
            fontWeight: 700,
            letterSpacing: "clamp(0.08em, 0.7vw, 0.2em)",
            textTransform: "uppercase",
            color: "rgba(255, 204, 106, 0.95)",
            fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          Framework
        </span>

        <PlatformHeaderAuthCluster initials={initials} />
      </div>
    </header>
  );
}
