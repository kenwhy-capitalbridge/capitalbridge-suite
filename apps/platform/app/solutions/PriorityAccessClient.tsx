"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PriorityAccessClientProps = {
  fullName: string;
  email: string;
  reportId?: string | null;
  /** Only Strategic Advisory (`plans.slug === strategic`) may open the request modal. */
  isStrategicPlan: boolean;
};

const STRATEGIC_ADVANTAGES = [
  "Financing structures that can exceed your repayment obligations",
  "Access to curated private opportunities not publicly available",
  "Monthly income distribution structured and executed on your behalf",
] as const;

const GATED_CTA_TOOLTIP = "Available with Strategic Advisory access";

const COUNTRY_OPTIONS = [
  { value: "MY", label: "Malaysia" },
  { value: "SG", label: "Singapore" },
  { value: "OTHER", label: "Other" },
] as const;

export function PriorityAccessClient({ fullName, email, reportId, isStrategicPlan }: PriorityAccessClientProps) {
  const [open, setOpen] = useState(false);
  const [gatedTipOpen, setGatedTipOpen] = useState(false);
  const gatedTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isStrategicPlan) setOpen(false);
  }, [isStrategicPlan]);

  useEffect(() => {
    if (isStrategicPlan) {
      setGatedTipOpen(false);
      if (gatedTipTimerRef.current) {
        clearTimeout(gatedTipTimerRef.current);
        gatedTipTimerRef.current = null;
      }
    }
  }, [isStrategicPlan]);

  useEffect(() => {
    return () => {
      if (gatedTipTimerRef.current) clearTimeout(gatedTipTimerRef.current);
    };
  }, []);
  const [country, setCountry] = useState("MY");
  const [contactPhone, setContactPhone] = useState("");
  const [subscriberMessage, setSubscriberMessage] = useState("");
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
          fullName,
          reportId,
          country,
          contactPhone: contactPhone.trim() || null,
          message: subscriberMessage.trim() || null,
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

  const buttonLabel = isStrategicPlan ? "Request Execution" : "Strategic Access Required";
  const subtext = isStrategicPlan
    ? "Submit your structure for priority access to execution pathways."
    : "Unlock execution capabilities, partner access, and structured income implementation under Strategic Advisory.";

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "0.65rem",
          maxWidth: 520,
        }}
      >
        {isStrategicPlan ? (
          <div style={{ display: "inline-block", maxWidth: "100%" }}>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pf-chrome-gold-btn priority-access-cta-btn"
            >
              {buttonLabel}
            </button>
          </div>
        ) : (
          <span
            className={`priority-access-cta-gated-wrap${gatedTipOpen ? " priority-access-cta-gated-wrap--tip-open" : ""}`}
          >
            <span id="priority-access-gated-desc" className="cb-visually-hidden">
              {GATED_CTA_TOOLTIP}
            </span>
            <button
              type="button"
              disabled
              aria-disabled={true}
              aria-describedby="priority-access-gated-desc"
              className="pf-chrome-gold-btn priority-access-cta-btn priority-access-cta-btn--plan-gated"
            >
              {buttonLabel}
            </button>
            <span
              className="priority-access-cta-gated-overlay"
              role="presentation"
              onPointerUp={(e) => {
                if (e.pointerType !== "touch") return;
                if (gatedTipTimerRef.current) clearTimeout(gatedTipTimerRef.current);
                setGatedTipOpen(true);
                gatedTipTimerRef.current = setTimeout(() => {
                  setGatedTipOpen(false);
                  gatedTipTimerRef.current = null;
                }, 2800);
              }}
            />
            <span className="priority-access-cta-tooltip-bubble" aria-hidden="true">
              {GATED_CTA_TOOLTIP}
            </span>
          </span>
        )}
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            lineHeight: 1.55,
            color: "rgba(246,245,241,0.78)",
            maxWidth: 480,
          }}
        >
          {subtext}
        </p>
        <div style={{ marginTop: "0.35rem", width: "100%" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "rgba(246,245,241,0.65)",
            }}
          >
            Strategic Advantages
          </p>
          <ul
            style={{
              margin: "0.5rem 0 0",
              paddingLeft: "1.15rem",
              color: "rgba(246,245,241,0.88)",
              fontSize: "0.92rem",
              lineHeight: 1.55,
            }}
          >
            {STRATEGIC_ADVANTAGES.map((line) => (
              <li key={line} style={{ marginBottom: "0.35rem" }}>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p
          style={{
            margin: "0.85rem 0 0",
            fontSize: "0.78rem",
            lineHeight: 1.5,
            color: "rgba(246,245,241,0.48)",
            maxWidth: 480,
          }}
        >
          Completing your models helps determine if your structure is ready for execution.
        </p>
      </div>

      {open && isStrategicPlan ? (
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

            <p style={{ margin: "1rem 0 0.65rem", color: "#30443a", lineHeight: 1.65 }}>
              You will be notified when execution becomes available in your market.
            </p>
            <p style={{ margin: "0 0 1.25rem", color: "#30443a", lineHeight: 1.65 }}>
              Your current structure will be reviewed for execution readiness. Capital Bridge may prepare recommendations
              ahead of partner onboarding.
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
                <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.55 }}>
                  Your request has been received.
                </p>
                <p style={{ margin: "0.65rem 0 0", lineHeight: 1.65 }}>
                  Capital Bridge™ will review your capital structure and notify you when execution becomes available in your market.
                </p>
                <p style={{ margin: "0.65rem 0 0", lineHeight: 1.65 }}>
                  You may be contacted earlier if your structure qualifies for early onboarding.
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
                  <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#30443a" }}>Country</span>
                    <select value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle()}>
                      {COUNTRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#30443a" }}>
                      Message (optional)
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 400,
                        color: "rgba(48,68,58,0.78)",
                        lineHeight: 1.45,
                        marginTop: -2,
                      }}
                    >
                      Add context for your request — goals, timing, or questions for the team
                    </span>
                    <textarea
                      value={subscriberMessage}
                      onChange={(e) => setSubscriberMessage(e.target.value)}
                      maxLength={8000}
                      rows={4}
                      placeholder="e.g. I am interested in execution once financing terms are confirmed…"
                      style={{
                        ...inputStyle(),
                        minHeight: 100,
                        resize: "vertical",
                        fontFamily: "inherit",
                        lineHeight: 1.5,
                      }}
                    />
                  </label>
                  <label
                    style={{
                      display: "grid",
                      gap: 6,
                      gridColumn: "1 / -1",
                    }}
                  >
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#30443a" }}>
                      Contact Number (optional)
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 400,
                        color: "rgba(48,68,58,0.78)",
                        lineHeight: 1.45,
                        marginTop: -2,
                      }}
                    >
                      Optional — helps us reach you faster when execution becomes available
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      name="contactPhone"
                      placeholder="+60 12-345 6789"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      onBlur={() => {
                        setContactPhone((v) =>
                          v
                            .replace(/[^\d+\s().-]/g, "")
                            .replace(/\s+/g, " ")
                            .trim(),
                        );
                      }}
                      style={{
                        ...inputStyle(),
                        fontSize: "max(16px, 0.95rem)",
                      }}
                    />
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
                    disabled={!canSubmit || submitting}
                    aria-busy={submitting}
                    onClick={handleSubmit}
                    className="pf-chrome-gold-btn priority-access-cta-btn"
                  >
                    {submitting ? "Saving..." : "Request Execution"}
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
