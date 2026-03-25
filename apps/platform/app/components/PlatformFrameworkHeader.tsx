import Image from "next/image";
import Link from "next/link";
import { createAppServerClient } from "@cb/supabase/server";
import { MARKETING_SITE_URL } from "@cb/shared/urls";
import { PlatformLogoutToMarketing } from "./PlatformLogoutToMarketing";

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
            <Image
              src="/logo-capital-bridge.png"
              alt="Capital Bridge"
              width={200}
              height={36}
              priority
              style={{
                height: "clamp(18px, 4.2vw, 28px)",
                width: "auto",
                maxWidth: "min(34vw, 170px)",
                objectFit: "contain",
                objectPosition: "left center",
                mixBlendMode: "lighten",
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

          <Link
            href="/login"
            style={{
              justifySelf: "end",
              padding: "0.35rem 0.75rem",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255, 204, 106, 0.95)",
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 204, 106, 0.55)",
              borderRadius: 4,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Login
          </Link>
        </div>
      </header>
    );
  }

  if (!user && !verifiedUserEmail) return null;

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
          <Image
            src="/logo-capital-bridge.png"
            alt="Capital Bridge"
            width={200}
            height={36}
            priority
            style={{
              height: "clamp(18px, 4.2vw, 28px)",
              width: "auto",
              maxWidth: "min(34vw, 170px)",
              objectFit: "contain",
              objectPosition: "left center",
              mixBlendMode: "lighten",
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

        <PlatformLogoutToMarketing />
      </div>
    </header>
  );
}
