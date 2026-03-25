import Image from "next/image";
import { createAppServerClient } from "@cb/supabase/server";
import { MARKETING_SITE_URL } from "@cb/shared/urls";
import { PlatformLogoutToMarketing } from "./PlatformLogoutToMarketing";

function marketingHomeUrl(): string {
  const base = MARKETING_SITE_URL.replace(/\/+$/, "");
  return `${base}/`;
}

/** Sticky bar: logo (marketing) | FRAMEWORK | Logout → marketing after sign-out. */
export async function PlatformFrameworkHeader() {
  const supabase = await createAppServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
          minHeight: 52,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0.35rem 1rem",
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
              height: 28,
              width: "auto",
              maxWidth: "min(42vw, 200px)",
              objectFit: "contain",
              objectPosition: "left center",
              mixBlendMode: "lighten",
            }}
          />
        </a>

        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
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
