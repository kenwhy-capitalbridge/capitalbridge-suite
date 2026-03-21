"use client";

import { useEffect, useState } from "react";
import { LOGIN_APP_URL } from "@cb/shared/urls";

type PaymentState =
  | { status: "idle" }
  | { status: "redirecting" }
  | { status: "error"; message: string };

/**
 * Payment is always created on the login origin (same-origin /api/bill/create).
 * From platform we redirect to login to complete payment, then user returns to dashboard.
 */
export function PaymentGate({ userId, plan }: { userId: string; plan?: string | null }) {
  const [state, setState] = useState<PaymentState>({ status: "idle" });

  useEffect(() => {
    if (!userId || state.status !== "idle") return;

    const planSlug = plan ?? "trial";
    const loginPaymentUrl = `${LOGIN_APP_URL}/confirm-payment?plan=${encodeURIComponent(planSlug)}`;
    setState({ status: "redirecting" });
    window.location.href = loginPaymentUrl;
  }, [plan, state.status, userId]);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "3rem auto",
        padding: "2rem 1.5rem",
        borderRadius: 12,
        border: "1px solid rgba(255,204,106,0.4)",
        background:
          "radial-gradient(circle at top, rgba(255,204,106,0.15), transparent 55%) #0D3A1D",
      }}
    >
      <p
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,204,106,0.85)",
          marginBottom: "0.75rem",
        }}
      >
        Access Required
      </p>
      <h1
        style={{
          fontFamily: "ui-serif, \"Roboto Serif\", Georgia, serif",
          fontSize: "1.6rem",
          margin: "0 0 0.75rem",
        }}
      >
        Unlock Capital Bridge Advisory Platform
      </h1>
      <p
        style={{
          fontSize: "0.95rem",
          color: "rgba(246,245,241,0.85)",
          lineHeight: 1.6,
          marginBottom: "1.25rem",
        }}
      >
        Your login is recognised, but there is no active advisory membership on file. Complete payment to unlock the
        full platform.
      </p>

      {state.status === "redirecting" && (
        <p style={{ fontSize: "0.85rem", color: "rgba(246,245,241,0.8)", marginBottom: "1rem" }}>
          Redirecting to secure payment…
        </p>
      )}

      {state.status === "error" && (
        <p style={{ fontSize: "0.85rem", color: "#ffb3b3", marginBottom: "1rem" }}>
          {state.message}
        </p>
      )}

      {state.status === "redirecting" && (
        <p style={{ fontSize: "0.85rem", color: "rgba(246,245,241,0.7)" }}>
          If you are not redirected,{" "}
          <a
            href={`${LOGIN_APP_URL}/confirm-payment?plan=${encodeURIComponent(plan ?? "trial")}`}
            style={{ color: "#FFCC6A", textDecoration: "underline" }}
          >
            click here to complete payment
          </a>
          .
        </p>
      )}
    </div>
  );
}

