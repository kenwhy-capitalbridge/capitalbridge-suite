import { createAppServerClient } from "@cb/supabase/server";
import { MARKETING_SITE_URL } from "@cb/shared/urls";
import { PlatformLoginButton } from "./PlatformLoginButton";
import { PlatformHeaderAuthCluster } from "./PlatformHeaderAuthCluster";
import { initialsFromFirstLastOrFallback } from "../../lib/profileInitials";

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
};

/** Sticky bar: logo (marketing) | Framework | Logout (auth) or Login (public). */
export async function PlatformFrameworkHeader({
  verifiedUserEmail,
  profileNames,
  publicBrowse = false,
  centerTitle = "Framework",
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
            className="cb-header-chrome-home"
            aria-label="Capital Bridge home"
            style={{
              justifySelf: "start",
              display: "flex",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <img
              className="cb-header-chrome-logo"
              src="/brand/CapitalBridgeLogo_Gold.svg"
              alt=""
              width={200}
              height={40}
              fetchPriority="high"
              decoding="async"
            />
            <span className="cb-header-chrome-brand-mobile" aria-hidden>
              Capital Bridge
            </span>
          </a>

          <span className="cb-header-chrome-title">Framework</span>

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

  let profileFirst = profileNames?.firstName ?? null;
  let profileLast = profileNames?.lastName ?? null;
  if (user && !profileNames) {
    const { data: prof } = await supabase
      .schema("public")
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    profileFirst = prof?.first_name?.trim() ?? null;
    profileLast = prof?.last_name?.trim() ?? null;
  }

  const initials = initialsFromFirstLastOrFallback(
    profileFirst,
    profileLast,
    displayName,
    emailForInitials
  );

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
          className="cb-header-chrome-home"
          aria-label="Capital Bridge home"
          style={{
            justifySelf: "start",
            display: "flex",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <img
            className="cb-header-chrome-logo"
            src="/brand/CapitalBridgeLogo_Gold.svg"
            alt=""
            width={200}
            height={40}
            fetchPriority="high"
            decoding="async"
          />
          <span className="cb-header-chrome-brand-mobile" aria-hidden>
            Capital Bridge
          </span>
        </a>

        <span className="cb-header-chrome-title">{centerTitle}</span>

        <PlatformHeaderAuthCluster initials={initials} />
      </div>
    </header>
  );
}
