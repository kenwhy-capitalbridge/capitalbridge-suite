"use client";

import { useMemo, useState } from "react";

type PriorityAccessClientProps = {
  fullName: string;
  email: string;
  reportId?: string | null;
};

const COUNTRY_OPTIONS = [
  { value: "MY", label: "Malaysia" },
  { value: "SG", label: "Singapore" },
  { value: "OTHER", label: "Other" },
] as const;

const INTEREST_OPTIONS = [
  { value: "", label: "Select one" },
  { value: "Financing", label: "Financing" },
  { value: "Insurance", label: "Insurance" },
  { value: "Income Structuring", label: "Income Structuring" },
] as const;

export function PriorityAccessClient({ fullName, email, reportId }: PriorityAccessClientProps) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("MY");
  const [interestType, setInterestType] = useState("");
  const [consentReview, setConsentReview] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => consentReview && consentContact && !submitting,
    [consentReview, consentContact, submitting],
  );

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/strategic-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          country,
          interestType: interestType || null,
          consentReview,
          consentContact,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to save your request");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "0.95rem 1.2rem",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "#0d3a1d",
          color: "#f6f5f1",
          fontSize: "0.95rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Request Priority Access
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="priority-access-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 16, 11, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 580,
              background: "#f6f5f1",
              color: "#10261b",
              borderRadius: 20,
              padding: "1.5rem",
              boxShadow: "0 30px 90px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(16,38,27,0.6)" }}>
                  Strategic access
                </p>
                <h2 id="priority-access-title" style={{ margin: "0.35rem 0 0", fontSize: "1.65rem", lineHeight: 1.15 }}>
                  Join Strategic Priority Access
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  border: 0,
                  background: "transparent",
                  fontSize: "1.5rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "#10261b",
                }}
              >
                ×
              </button>
            </div>

            <p style={{ margin: "1rem 0 1.25rem", color: "#30443a", lineHeight: 1.65 }}>
              You will be notified when execution becomes available in your market. Capital Bridge may review your structure and prepare recommendations ahead of partner onboarding.
            </p>

            {submitted ? (
              <div
                style={{
                  padding: "1rem 1.1rem",
                  borderRadius: 14,
                  background: "rgba(13,58,29,0.08)",
                  border: "1px solid rgba(13,58,29,0.12)",
                }}
              >
                <p style={{ margin: 0, fontWeight: 700 }}>Priority access requested.</p>
                <p style={{ margin: "0.4rem 0 0", lineHeight: 1.6 }}>
                  You’ll be among the first to hear when structured execution opens in your market.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#30443a" }}>Full Name</span>
                    <input value={fullName} readOnly style={inputStyle(true)} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#30443a" }}>Email</span>
                    <input value={email} readOnly style={inputStyle(true)} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#30443a" }}>Country</span>
                    <select value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle()}>
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#30443a" }}>
                      What are you most interested in?
                    </span>
                    <select value={interestType} onChange={(e) => setInterestType(e.target.value)} style={inputStyle()}>
                      {INTEREST_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ marginTop: "1rem", display: "grid", gap: 10 }}>
                  <label style={checkboxRowStyle}>
                    <input type="checkbox" checked={consentReview} onChange={(e) => setConsentReview(e.target.checked)} />
                    <span>I consent to Capital Bridge reviewing my report</span>
                  </label>
                  <label style={checkboxRowStyle}>
                    <input type="checkbox" checked={consentContact} onChange={(e) => setConsentContact(e.target.checked)} />
                    <span>I agree to be contacted when execution becomes available</span>
                  </label>
                </div>

                {error ? (
                  <p style={{ margin: "0.9rem 0 0", color: "#b42318", fontSize: "0.9rem" }}>{error}</p>
                ) : null}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    style={{
                      padding: "0.9rem 1.2rem",
                      borderRadius: 12,
                      border: 0,
                      background: canSubmit ? "#0d3a1d" : "rgba(13,58,29,0.28)",
                      color: "#f6f5f1",
                      fontWeight: 700,
                      cursor: canSubmit ? "pointer" : "not-allowed",
                    }}
                  >
                    {submitting ? "Saving..." : "Request Priority Access"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function inputStyle(readOnly = false): React.CSSProperties {
  return {
    minHeight: 46,
    borderRadius: 12,
    border: "1px solid rgba(16,38,27,0.14)",
    padding: "0.8rem 0.9rem",
    background: readOnly ? "rgba(16,38,27,0.05)" : "#fff",
    color: "#10261b",
    fontSize: "0.95rem",
  };
}

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  fontSize: "0.92rem",
  color: "#30443a",
  lineHeight: 1.5,
};
