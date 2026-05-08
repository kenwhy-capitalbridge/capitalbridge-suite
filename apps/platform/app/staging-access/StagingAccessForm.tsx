"use client";

import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { HeaderBrandPicture } from "@cb/ui";
import { StagingAccessBackdrop } from "./StagingAccessBackdrop";

const GOLD = "#FFCC6A";
const WHITE = "#F6F5F1";
const GREEN = "#0D3A1D";
const MUTED = "rgba(246, 245, 241, 0.88)";

const sans = 'var(--font-staging-sans), "Inter", system-ui, sans-serif';
const serif = 'var(--font-staging-serif), "Roboto Serif", Georgia, serif';

export function StagingAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const from = searchParams.get("from") || "/";
  const returnLabel = useMemo(() => {
    const path = from.startsWith("/") ? from : "/";
    if (path === "/" || path === "") return "the platform home";
    return path;
  }, [from]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/staging-gate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(j?.error ?? "We could not unlock staging. Please try again.");
        return;
      }
      router.replace(from.startsWith("/") ? from : "/");
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={rootStyle}>
      <StagingAccessBackdrop />

      <main style={mainStyle}>
        <div style={cardStyle}>
          <div style={headerBlockStyle}>
            <a
              href="https://thecapitalbridge.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={logoLinkStyle}
              aria-label="Capital Bridge home"
            >
              <HeaderBrandPicture />
            </a>
            <p style={eyebrowStyle}>Preview environment</p>
            <h1 style={h1Style}>Staging access</h1>
            <p style={bodyTextStyle}>
              Enter the staging password to unlock this host. This gate applies only to staging — not production.
            </p>
            <p style={hintStyle}>
              After sign-in you&apos;ll continue to <span style={hintEmStyle}>{returnLabel}</span>
            </p>
          </div>

          <form onSubmit={onSubmit} style={formStyle}>
            <label style={labelWrapStyle}>
              <span style={labelTextStyle}>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                style={inputStyle}
              />
            </label>

            {error ? <p style={errorStyle}>{error}</p> : null}

            <button type="submit" disabled={pending || !password.trim()} style={buttonStyle(pending || !password.trim())}>
              {pending ? "Checking…" : "Continue"}
            </button>
          </form>

          <div style={footerRuleStyle}>
            <div style={legalRowStyle}>
              <p style={legalLeftStyle}>
                © {new Date().getFullYear()} Capital Bridge. Proprietary — unauthorised use prohibited.
              </p>
              <p style={legalRightStyle}>Private & Confidential</p>
            </div>
          </div>
        </div>

        <p style={pageTaglineStyle}>Capital Bridge — Staging</p>
      </main>
    </div>
  );
}

const rootStyle: CSSProperties = {
  position: "relative",
  isolation: "isolate",
  display: "flex",
  minHeight: "100vh",
  flexDirection: "column",
};

const mainStyle: CSSProperties = {
  position: "relative",
  zIndex: 5,
  display: "flex",
  flex: 1,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 16px",
  color: WHITE,
  fontFamily: sans,
  pointerEvents: "auto",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 440,
  borderRadius: 17,
  border: "1px solid rgba(255, 204, 106, 0.42)",
  background: "linear-gradient(180deg, rgba(13, 58, 29, 0.96) 0%, rgba(7, 38, 20, 0.94) 100%)",
  boxShadow:
    "0 24px 64px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 204, 106, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
  padding: "clamp(28px, 5vw, 36px)",
  pointerEvents: "auto",
};

const headerBlockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  textAlign: "center",
  marginBottom: 24,
};

const logoLinkStyle: CSSProperties = {
  display: "inline-flex",
  opacity: 0.95,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: GOLD,
};

const h1Style: CSSProperties = {
  margin: 0,
  fontFamily: serif,
  fontSize: "clamp(1.65rem, 4vw, 2rem)",
  fontWeight: 600,
  lineHeight: 1.15,
  color: WHITE,
};

const bodyTextStyle: CSSProperties = {
  margin: 0,
  maxWidth: "34ch",
  fontSize: 14,
  lineHeight: 1.55,
  color: MUTED,
};

const hintStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  color: "rgba(246, 245, 241, 0.65)",
};

const hintEmStyle: CSSProperties = {
  fontWeight: 600,
  color: "rgba(246, 245, 241, 0.9)",
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const labelWrapStyle: CSSProperties = {
  display: "block",
};

const labelTextStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(246, 245, 241, 0.75)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 16,
  fontFamily: sans,
  color: WHITE,
  background: "rgba(4, 22, 14, 0.85)",
  border: "1px solid rgba(255, 204, 106, 0.45)",
  outline: "none",
  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.35)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  lineHeight: 1.4,
  color: "#fecaca",
  background: "rgba(127, 29, 29, 0.35)",
  border: "1px solid rgba(248, 113, 113, 0.35)",
};

function buttonStyle(disabled: boolean): CSSProperties {
  return {
    width: "100%",
    borderRadius: 11,
    padding: "12px 16px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontFamily: sans,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    border: `1px solid ${GOLD}`,
    background: GOLD,
    color: GREEN,
    boxShadow: disabled ? "none" : "0 8px 24px rgba(0,0,0,0.35)",
  };
}

const footerRuleStyle: CSSProperties = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid rgba(255, 204, 106, 0.2)",
};

const legalRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "flex-start",
  justifyContent: "space-between",
};

const legalLeftStyle: CSSProperties = {
  margin: 0,
  maxWidth: "52ch",
  fontSize: 10,
  lineHeight: 1.45,
  color: "rgba(246, 245, 241, 0.55)",
};

const legalRightStyle: CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: GOLD,
  flexShrink: 0,
};

const pageTaglineStyle: CSSProperties = {
  marginTop: 28,
  textAlign: "center",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(246, 245, 241, 0.4)",
};
