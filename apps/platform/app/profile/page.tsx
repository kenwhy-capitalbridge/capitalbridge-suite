import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_APP_URL } from "@cb/shared/urls";
import { getServerUserAndMembership } from "../../lib/auth";
import { formatPlanLabel, initialsFromDisplayName } from "../../lib/profileInitials";
import { PlatformFrameworkHeader } from "../components/PlatformFrameworkHeader";
import { ProfileAccountEmailForm } from "../components/ProfileAccountEmailForm";

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

  const displayName = user.name?.trim() || null;
  const initials = initialsFromDisplayName(displayName, user.email ?? null);
  const planLabel = formatPlanLabel(membership?.plan);
  const startLabel = formatDateIso(membership?.start_date ?? null);
  const endLabel = formatDateIso(membership?.end_date ?? null);

  const validitySummary =
    membership?.end_date == null
      ? "No fixed end date on your current access window."
      : endLabel
        ? `Access is set to run through ${endLabel}.`
        : "See your membership dates below.";

  const pricingHref = `${LOGIN_APP_URL.replace(/\/+$/, "")}/pricing`;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b2e18" }}>
      <PlatformFrameworkHeader verifiedUserEmail={user.email} />

      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "1.5rem 1rem 3rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            marginBottom: "1.25rem",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 9999,
              fontSize: "1rem",
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
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.25rem, 3.5vw, 1.5rem)",
                fontWeight: 700,
                fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
                color: "rgba(246, 245, 241, 0.98)",
              }}
            >
              Your profile
            </h1>
            {displayName ? (
              <p
                style={{
                  margin: "0.2rem 0 0",
                  fontSize: "0.88rem",
                  color: "rgba(246, 245, 241, 0.75)",
                }}
              >
                {displayName}
              </p>
            ) : null}
          </div>
        </div>

        <div
          style={{
            padding: "1.25rem 1.15rem",
            borderRadius: 10,
            backgroundColor: "rgba(13, 58, 29, 0.55)",
            border: "1px solid rgba(255, 204, 106, 0.22)",
          }}
        >
          <dl style={{ margin: 0, display: "grid", gap: "0.85rem" }}>
            <div>
              <dt
                style={{
                  margin: 0,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255, 204, 106, 0.78)",
                }}
              >
                Account type
              </dt>
              <dd
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.92rem",
                  color: "rgba(246, 245, 241, 0.92)",
                  lineHeight: 1.45,
                }}
              >
                Active member{membership?.plan ? ` · ${planLabel} plan` : ""}
              </dd>
            </div>

            <div>
              <dt
                style={{
                  margin: 0,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255, 204, 106, 0.78)",
                }}
              >
                Sign-in email
              </dt>
              <dd
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.92rem",
                  color: "rgba(246, 245, 241, 0.92)",
                  wordBreak: "break-word",
                }}
              >
                {user.email ?? "—"}
              </dd>
            </div>

            <div>
              <dt
                style={{
                  margin: 0,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255, 204, 106, 0.78)",
                }}
              >
                Access period
              </dt>
              <dd
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.92rem",
                  color: "rgba(246, 245, 241, 0.92)",
                  lineHeight: 1.45,
                }}
              >
                {validitySummary}
                {startLabel || endLabel ? (
                  <span style={{ display: "block", marginTop: "0.35rem", fontSize: "0.82rem", opacity: 0.85 }}>
                    {startLabel ? `Started: ${startLabel}` : null}
                    {startLabel && endLabel ? " · " : null}
                    {endLabel && membership?.end_date != null ? `Ends: ${endLabel}` : null}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>

          <div style={{ marginTop: "1.35rem" }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255, 204, 106, 0.78)",
              }}
            >
              Plans & pricing
            </p>
            <p
              style={{
                margin: "0.35rem 0 0",
                fontSize: "0.88rem",
                lineHeight: 1.5,
                color: "rgba(246, 245, 241, 0.78)",
              }}
            >
              Review packages or upgrade on the Capital Bridge login site.
            </p>
            <a
              href={pricingHref}
              style={{
                display: "inline-block",
                marginTop: "0.65rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "rgba(255, 214, 150, 0.98)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Open pricing & packages
            </a>
          </div>

          <ProfileAccountEmailForm currentEmail={user.email ?? null} />

          <p style={{ margin: "1.75rem 0 0", fontSize: "0.8rem", color: "rgba(246, 245, 241, 0.55)" }}>
            <Link
              href="/"
              style={{
                color: "rgba(255, 214, 150, 0.9)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              ← Back to Framework home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
