"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";
import { createAppBrowserClient, isSupabaseConfigured } from "@cb/supabase/browser";
import { CHECKOUT_COUNTRIES, MARKET_LABELS, type MarketId } from "@cb/shared/markets";

type ApiOkUpdated = { ok: true; mode: "updated"; to_market: MarketId };
type ApiOkPayment = {
  ok: true;
  mode: "payment_required";
  checkoutUrl: string;
  delta_myr: number;
  from_market: MarketId;
  to_market: MarketId;
};
type ApiPreview = {
  ok: true;
  preview: true;
  needs_payment: boolean;
  delta_myr: number;
  from_market: MarketId;
  to_market: MarketId;
};
type ApiErr = { error?: string; detail?: string };

type PendingTopUp = {
  from_market: MarketId;
  to_market: MarketId;
  delta_myr: number;
};

type Props = {
  currentMarket: MarketId | null;
};

function friendlyMarketChangeApiError(detail: string | undefined, fallback: string): string {
  const raw = (detail || "").trim();
  if (
    raw.includes("advisory_market") &&
    (raw.includes("schema cache") || /could not find.*column/i.test(raw))
  ) {
    return "Region change is temporarily unavailable while the database is updated. Please try again in a few minutes, or contact support if this continues.";
  }
  return raw || fallback;
}

export function ProfileAdvisoryMarketForm({ currentMarket }: Props) {
  const effectiveCurrent = currentMarket ?? "MY";
  const [selected, setSelected] = useState<MarketId>(effectiveCurrent);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTopUp, setPendingTopUp] = useState<PendingTopUp | null>(null);

  useEffect(() => {
    setSelected(currentMarket ?? "MY");
  }, [currentMarket]);

  const options = useMemo(
    () =>
      CHECKOUT_COUNTRIES.map((c) => ({
        value: c.market,
        label: `${c.flag} ${c.label} (${MARKET_LABELS[c.market]})`,
      })),
    []
  );

  const submit = useCallback(async () => {
    setMessage(null);
    setError(null);
    setPendingTopUp(null);

    if (selected === effectiveCurrent) {
      setError("Select a different country to change your advisory region.");
      return;
    }

    setBusy(true);
    try {
      if (!isSupabaseConfigured) {
        setError("We could not update your region right now.");
        return;
      }

      const supabase = createAppBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Your session expired. Sign in again.");
        return;
      }

      const previewRes = await fetch("/api/billing/request-market-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_market: selected, preview_only: true }),
      });
      const previewJson = (await previewRes.json().catch(() => ({}))) as ApiPreview | ApiErr;

      if (!previewRes.ok) {
        const err = previewJson as ApiErr;
        setError(friendlyMarketChangeApiError(err.detail || err.error, "Could not check region change."));
        return;
      }

      const preview = previewJson as ApiPreview;
      if (preview.ok !== true || preview.preview !== true) {
        const err = previewJson as ApiErr;
        setError(friendlyMarketChangeApiError(err.detail || err.error, "Could not check region change."));
        return;
      }

      if (!preview.needs_payment) {
        const applyRes = await fetch("/api/billing/request-market-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to_market: selected, preview_only: false }),
        });
        const applyJson = (await applyRes.json().catch(() => ({}))) as ApiOkUpdated | ApiErr;
        if (!applyRes.ok || !("mode" in applyJson) || applyJson.mode !== "updated") {
          const err = applyJson as ApiErr;
          setError(friendlyMarketChangeApiError(err.detail || err.error, "Update failed."));
          return;
        }
        setMessage("Your advisory region has been updated. Model apps will use the new currency on next load.");
        return;
      }

      setPendingTopUp({
        from_market: preview.from_market,
        to_market: preview.to_market,
        delta_myr: preview.delta_myr,
      });
    } finally {
      setBusy(false);
    }
  }, [effectiveCurrent, selected]);

  const proceedToPayment = useCallback(async () => {
    if (!pendingTopUp) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/request-market-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_market: pendingTopUp.to_market, preview_only: false }),
      });
      const json = (await res.json().catch(() => ({}))) as ApiOkPayment | ApiErr;
      if (!res.ok || !("mode" in json) || json.mode !== "payment_required" || !json.checkoutUrl) {
        const err = json as ApiErr;
        setError(friendlyMarketChangeApiError(err.detail || err.error, "Could not start payment."));
        return;
      }
      window.location.href = json.checkoutUrl;
    } finally {
      setBusy(false);
    }
  }, [pendingTopUp]);

  return (
    <section
      style={{
        marginTop: "clamp(1.25rem, 3.5vw, 1.75rem)",
        paddingTop: "clamp(1.1rem, 3vw, 1.5rem)",
        borderTop: "1px solid rgba(255, 204, 106, 0.28)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "clamp(0.88rem, 2.4vw, 1rem)",
          fontWeight: 700,
          fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
          color: "rgba(246, 245, 241, 0.95)",
          lineHeight: 1.25,
        }}
      >
        Advisory region &amp; currency
      </h2>
      <p
        style={{
          margin: "clamp(0.45rem, 1.5vw, 0.6rem) 0 0",
          fontSize: "clamp(0.74rem, 2.1vw, 0.82rem)",
          lineHeight: 1.5,
          color: "rgba(246, 245, 241, 0.72)",
        }}
      >
        Your model apps use the currency for the region you first checked out with. To use a higher-priced region for
        your current plan, you may need a one-time top-up (charged in MYR via our payment provider).
      </p>

      <label
        htmlFor="settings-advisory-market"
        style={{
          display: "block",
          marginTop: "clamp(0.85rem, 2.5vw, 1.1rem)",
          fontSize: "clamp(0.64rem, 2vw, 0.72rem)",
          fontWeight: 600,
          letterSpacing: "clamp(0.04em, 0.5vw, 0.06em)",
          textTransform: "uppercase",
          color: "rgba(255, 204, 106, 0.88)",
        }}
      >
        Country / region
      </label>
      <div className="settings-page-email-row">
        <select
          id="settings-advisory-market"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value as MarketId);
            setError(null);
            setMessage(null);
          }}
          disabled={busy}
          className="settings-page-email-input"
          style={{
            flex: "1 1 220px",
            minWidth: "min(100%, 11rem)",
            maxWidth: 420,
            boxSizing: "border-box",
            padding: "clamp(0.5rem, 1.6vw, 0.55rem) clamp(0.6rem, 2vw, 0.75rem)",
            fontSize: "clamp(1rem, 0.82rem + 2vw, 1.05rem)",
            color: "rgba(13, 58, 29, 0.95)",
            backgroundColor: "rgba(255, 252, 245, 0.98)",
            border: "1px solid rgba(255, 204, 106, 0.35)",
            borderRadius: 6,
            minHeight: 44,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          aria-busy={busy}
          className="settings-page-email-submit cb-settings-gold-cta-hover"
          style={{
            flexShrink: 0,
            padding: "clamp(0.42rem, 1.4vw, 0.45rem) clamp(0.85rem, 2.5vw, 1.1rem)",
            minHeight: 44,
            fontSize: "clamp(0.62rem, 1.9vw, 0.68rem)",
            fontWeight: 700,
            letterSpacing: "clamp(0.06em, 0.8vw, 0.1em)",
            textTransform: "uppercase",
            color: "rgba(13, 58, 29, 0.95)",
            backgroundColor: "rgba(255, 204, 106, 0.92)",
            border: "2px solid rgba(255, 204, 106, 0.55)",
            borderRadius: 8,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.65 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: busy ? 0 : 6,
            boxSizing: "border-box",
            transition: "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
            ...(busy ? { minWidth: "12rem" } : {}),
          }}
        >
          {busy ? (
            <span className="cb-pending-btn-inner">
              <ChromeSpinnerGlyph sizePx={14} />
              <span className="cb-visually-hidden">Updating region</span>
            </span>
          ) : (
            "Request region change"
          )}
        </button>
      </div>

      {message ? (
        <p
          className="settings-page-callout settings-page-callout--success"
          style={{
            margin: "clamp(0.65rem, 2vw, 0.85rem) 0 0",
            padding: "clamp(0.55rem, 1.8vw, 0.65rem) clamp(0.6rem, 2vw, 0.75rem)",
            fontSize: "clamp(0.74rem, 2.1vw, 0.82rem)",
            lineHeight: 1.45,
            color: "#10261b",
            backgroundColor: "#f6f5f1",
            border: "1px solid rgba(255, 204, 106, 0.55)",
            borderRadius: 6,
            maxWidth: "min(100%, 520px)",
            boxSizing: "border-box",
          }}
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          className="settings-page-callout settings-page-callout--error"
          style={{
            margin: "clamp(0.65rem, 2vw, 0.85rem) 0 0",
            padding: "clamp(0.55rem, 1.8vw, 0.65rem) clamp(0.6rem, 2vw, 0.75rem)",
            fontSize: "clamp(0.74rem, 2.1vw, 0.82rem)",
            lineHeight: 1.45,
            color: "#5c1f16",
            backgroundColor: "#fff5f4",
            border: "1px solid rgba(180, 35, 24, 0.35)",
            borderRadius: 6,
            maxWidth: "min(100%, 520px)",
            boxSizing: "border-box",
          }}
        >
          {error}
        </p>
      ) : null}

      {pendingTopUp ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="topup-title"
          className="settings-page-advisory-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
          }}
        >
          <div
            className="settings-page-advisory-modal-panel"
            style={{
              maxWidth: 440,
              width: "100%",
              padding: "clamp(1rem, 4vw, 1.35rem)",
              borderRadius: 12,
              border: "1px solid rgba(255, 204, 106, 0.35)",
              background: "#0D3A1D",
              color: "rgba(246, 245, 241, 0.95)",
            }}
          >
            <h3
              id="topup-title"
              style={{
                margin: 0,
                fontSize: "clamp(0.88rem, 2.4vw, 1rem)",
                fontWeight: 700,
                fontFamily: 'ui-serif, "Roboto Serif", Georgia, serif',
                color: "rgba(246, 245, 241, 0.95)",
                lineHeight: 1.25,
              }}
            >
              Regional top-up required
            </h3>
            <p
              style={{
                margin: "clamp(0.45rem, 1.5vw, 0.6rem) 0 0",
                fontSize: "clamp(0.74rem, 2.1vw, 0.82rem)",
                lineHeight: 1.5,
                color: "rgba(246, 245, 241, 0.72)",
              }}
            >
              Moving from {pendingTopUp.from_market} to {pendingTopUp.to_market} increases your plan&apos;s regional
              price. You will pay approximately{" "}
              <strong style={{ color: "rgba(246, 245, 241, 0.95)" }}>
                RM {pendingTopUp.delta_myr.toFixed(2)}
              </strong>{" "}
              (MYR) to align your membership before the region changes.
            </p>
            <div
              className="settings-page-advisory-modal-actions"
              style={{
                marginTop: "clamp(0.85rem, 2.5vw, 1.1rem)",
                display: "flex",
                flexWrap: "wrap",
                gap: "clamp(0.5rem, 2vw, 0.75rem)",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => void proceedToPayment()}
                disabled={busy}
                aria-busy={busy}
                className="cb-settings-gold-cta-hover"
                style={{
                  padding: "clamp(0.42rem, 1.4vw, 0.45rem) clamp(0.85rem, 2.5vw, 1.1rem)",
                  minHeight: 44,
                  fontSize: "clamp(0.62rem, 1.9vw, 0.68rem)",
                  fontWeight: 700,
                  letterSpacing: "clamp(0.06em, 0.8vw, 0.1em)",
                  textTransform: "uppercase",
                  color: "rgba(13, 58, 29, 0.95)",
                  backgroundColor: "rgba(255, 204, 106, 0.92)",
                  border: "2px solid rgba(255, 204, 106, 0.55)",
                  borderRadius: 8,
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? 0.65 : 1,
                }}
              >
                {busy ? (
                  <span className="cb-pending-btn-inner">
                    <ChromeSpinnerGlyph sizePx={14} />
                    <span className="cb-visually-hidden">Opening payment</span>
                  </span>
                ) : (
                  "Confirm and pay"
                )}
              </button>
              <button
                type="button"
                onClick={() => setPendingTopUp(null)}
                disabled={busy}
                style={{
                  padding: "clamp(0.42rem, 1.4vw, 0.45rem) clamp(0.85rem, 2.5vw, 1.1rem)",
                  minHeight: 44,
                  fontSize: "clamp(0.62rem, 1.9vw, 0.68rem)",
                  fontWeight: 700,
                  letterSpacing: "clamp(0.06em, 0.8vw, 0.1em)",
                  textTransform: "uppercase",
                  color: "rgba(246, 245, 241, 0.88)",
                  backgroundColor: "transparent",
                  border: "2px solid rgba(255, 204, 106, 0.4)",
                  borderRadius: 8,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
