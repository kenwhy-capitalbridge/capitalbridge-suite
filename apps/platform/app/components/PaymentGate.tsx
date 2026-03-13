"use client";

import { useEffect, useState } from "react";
import { API_APP_URL } from "@cb/shared/urls";

type PaymentState =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "ready"; checkoutUrl: string }
  | { status: "error"; message: string };

export function PaymentGate({ userId, plan }: { userId: string; plan?: string | null }) {
  const [state, setState] = useState<PaymentState>({ status: "idle" });

  useEffect(() => {
    if (!userId || state.status !== "idle") return;

    const createBill = async () => {
      try {
        setState({ status: "creating" });

        const resp = await fetch(`${API_APP_URL}/billing/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan: plan ?? "trial" }),
        });

        if (!resp.ok) {
          throw new Error("Unable to create payment link");
        }

        const data = (await resp.json()) as { checkoutUrl?: string };
        if (!data.checkoutUrl) {
          throw new Error("Payment link missing from response");
        }

        setState({ status: "ready", checkoutUrl: data.checkoutUrl });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setState({ status: "error", message });
      }
    };

    void createBill();
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
        Activate Capital Bridge Advisory Platform
      </h1>
      <p
        style={{
          fontSize: "0.95rem",
          color: "rgba(246,245,241,0.85)",
          lineHeight: 1.6,
          marginBottom: "1.25rem",
        }}
      >
        Your login is recognised, but there is no active advisory membership on file. Activate access to unlock the
        full platform.
      </p>

      {state.status === "creating" && (
        <p style={{ fontSize: "0.85rem", color: "rgba(246,245,241,0.8)", marginBottom: "1rem" }}>
          Preparing your secure payment link…
        </p>
      )}

      {state.status === "error" && (
        <p style={{ fontSize: "0.85rem", color: "#ffb3b3", marginBottom: "1rem" }}>
          We couldn&apos;t prepare the payment link automatically. ({state.message})
        </p>
      )}

      <button
        type="button"
        disabled={state.status !== "ready"}
        onClick={() => {
          if (state.status === "ready") window.location.href = state.checkoutUrl;
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.85rem 1.6rem",
          borderRadius: 999,
          border: "1px solid rgba(255,204,106,0.9)",
          background: state.status === "ready" ? "#FFCC6A" : "rgba(255,204,106,0.25)",
          color: "#0D3A1D",
          fontSize: "0.82rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: state.status === "ready" ? "pointer" : "not-allowed",
          opacity: state.status === "ready" ? 1 : 0.7,
        }}
      >
        {state.status === "ready" ? "Proceed to Secure Payment" : "Preparing Payment"}
      </button>
    </div>
  );
}

