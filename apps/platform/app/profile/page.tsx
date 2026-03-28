import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import { getServerUserAndMembership } from "../../lib/auth";
import { formatPlanLabel, initialsFromFirstLastOrFallback } from "../../lib/profileInitials";
import { PlatformFrameworkHeader } from "../components/PlatformFrameworkHeader";
import { ProfileAccountEmailForm } from "../components/ProfileAccountEmailForm";
import { ProfileHistoryBackButton } from "../components/ProfileHistoryBackButton";
import { ProfilePlansLink } from "../components/ProfilePlansLink";

export const dynamic = "force-dynamic";

function formatDateIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ProfilePage() {
  const { user, membership } = await getServerUserAndMembership();

  if (!user) {
    const h = await headers();
    const host = h.get("host") ?? "platform.thecapitalbridge.com";
    const proto = h.get("x-forwarded-proto") === "https" ? "https" : "http";
    const back = `${proto}://${host}/profile`;
    const loginUrl = new URL(`${LOGIN_APP_URL}/access`);
    loginUrl.searchParams.set("redirectTo", back);
    redirect(loginUrl.toString());
  }

  const fn = user.firstName?.trim();
  const ln = user.lastName?.trim();
  const displayName =
    fn && ln ? `${fn} ${ln}` : fn || ln ? (fn ?? ln)! : user.name?.trim() || null;
  const initials = initialsFromFirstLastOrFallback(
    user.firstName,
    user.lastName,
    user.name?.trim() || null,
    user.email ?? null
  );
  const planLabel = formatPlanLabel(membership?.plan);
  const startLabel = formatDateIso(membership?.start_date ?? null);
  const endLabel = formatDateIso(membership?.end_date ?? null);

  const validitySummary =
    membership?.end_date == null
      ? "No fixed end date on your current access window."
      : endLabel
        ? `Access is set to run through ${endLabel}.`
        : "See your membership dates below.";

  const plansHref = `${LOGIN_APP_URL.replace(/\/+$/, "")}/plans`;

  const dtStyle: CSSProperties = {
    margin: 0,
    fontSize: "clamp(0.58rem, 1.8vw, 0.68rem)",
    fontWeight: 700,
    letterSpacing: "clamp(0.05em, 0.6vw, 0.08em)",
    textTransform: "uppercase",
    color: "rgba(255, 204, 106, 0.78)",
  };

  const ddStyle: CSSProperties = {
    margin: "clamp(0.18rem, 0.55vw, 0.25rem) 0 0",
    fontSize: "clamp(0.78rem, 2.4vw, 0.92rem)",
    color: "rgba(246, 245, 241, 0.92)",
    lineHeight: 1.45,
  };

  const avatarSize = "clamp(40px, 10.5vw, 48px)";

  return (
    <div className="profile-page" style={{ minHeight: "100vh", backgroundColor: "#0D3A1D" }}>
      <PlatformFrameworkHeader
        verifiedUserEmail={user.email}
        centerTitle="USER PROFILE"
        profileNames={{ firstName: user.firstName ?? null, lastName: user.lastName ?? null }}
      />

      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding:
            "clamp(0.7rem, 1.8vw + 0.35rem, 1.5rem) clamp(0.5rem, 2.2vw + 0.2rem, 1rem) clamp(1.6rem, 3.5vw + 0.75rem, 3rem)",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.55rem, 2.2vw, 0.85rem)",
            marginBottom: "clamp(0.85rem, 2.5vw, 1.25rem)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: avatarSize,
              height: avatarSize,
              borderRadius: 9999,
              fontSize: "clamp(0.78rem, 2.6vw, 1rem)",
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: "rgba(13, 58, 29, 0.95)",
              backgroundColor: "rgba(255, 204, 106, 0.92)",
              border: "1px solid rgba(255, 204, 106, 0.55)",
              flexShrink: 0,
            }}
          >
            {initials}
          </span>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.02rem, 2.6vw + 0.45rem, 1.5rem)",
                fontWeight: 700,
                fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
                color: "rgba(246, 245, 241, 0.98)",
                lineHeight: 1.2,
              }}
            >
              Your Profile
            </h1>
            {displayName ? (
              <p
                style={{
                  margin: "clamp(0.12rem, 0.5vw, 0.2rem) 0 0",
                  fontSize: "clamp(0.74rem, 2.1vw, 0.88rem)",
                  color: "rgba(246, 245, 241, 0.75)",
                  lineHeight: 1.35,
                }}
              >
                {displayName}
              </p>
            ) : null}
          </div>
        </div>

        <div
          style={{
            padding:
              "clamp(0.75rem, 2.6vw, 1.25rem) clamp(0.65rem, 2.4vw, 1.15rem)",
            borderRadius: "clamp(8px, 2vw, 10px)",
            backgroundColor: "rgba(13, 58, 29, 0.55)",
            border: "1px solid rgba(255, 204, 106, 0.22)",
          }}
        >
          <dl
            style={{
              margin: 0,
              display: "grid",
              gap: "clamp(0.6rem, 2vw, 0.85rem)",
            }}
          >
            <div>
              <dt style={dtStyle}>Account type</dt>
              <dd style={ddStyle}>
                Active member{membership?.plan ? ` · ${planLabel} plan` : ""}
              </dd>
            </div>

            <div>
              <dt style={dtStyle}>Sign-in email</dt>
              <dd
                style={{
                  ...ddStyle,
                  wordBreak: "break-word",
                }}
              >
                {user.email ?? "—"}
              </dd>
            </div>

            <div>
              <dt style={dtStyle}>Access period</dt>
              <dd style={ddStyle}>
                {validitySummary}
                {startLabel || endLabel ? (
                  <span
                    style={{
                      display: "block",
                      marginTop: "clamp(0.28rem, 1vw, 0.35rem)",
                      fontSize: "clamp(0.72rem, 2vw, 0.82rem)",
                      opacity: 0.85,
                      lineHeight: 1.4,
                    }}
                  >
                    {startLabel ? `Started: ${startLabel}` : null}
                    {startLabel && endLabel ? " · " : null}
                    {endLabel && membership?.end_date != null ? `Ends: ${endLabel}` : null}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>

          <div style={{ marginTop: "clamp(1rem, 2.8vw, 1.35rem)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "clamp(0.58rem, 1.8vw, 0.68rem)",
                fontWeight: 700,
                letterSpacing: "clamp(0.05em, 0.6vw, 0.08em)",
                textTransform: "uppercase",
                color: "rgba(255, 204, 106, 0.78)",
              }}
            >
              Plans & Pricing
            </p>
            <p
              style={{
                margin: "clamp(0.28rem, 0.9vw, 0.35rem) 0 0",
                fontSize: "clamp(0.76rem, 2.1vw, 0.88rem)",
                lineHeight: 1.5,
                color: "rgba(246, 245, 241, 0.78)",
              }}
            >
              Review packages or upgrade on the Capital Bridge login site.
            </p>
            <div style={{ marginTop: "clamp(0.5rem, 1.5vw, 0.65rem)" }}>
              <ProfilePlansLink href={plansHref} />
            </div>
          </div>

          <ProfileAccountEmailForm currentEmail={user.email ?? null} />

          <ProfileHistoryBackButton />
        </div>
      </main>
    </div>
  );
}
