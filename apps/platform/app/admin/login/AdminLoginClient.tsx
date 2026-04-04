"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function AdminLoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/gate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Sign-in failed");
        }
        router.replace(nextPath);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      } finally {
        setBusy(false);
      }
    },
    [password, nextPath, router],
  );

  return (
    <form onSubmit={(e) => void onSubmit(e)} style={{ display: "grid", gap: 14, maxWidth: 360 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>Admin password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "0.65rem 0.75rem",
            borderRadius: 8,
            border: "1px solid rgba(16,38,27,0.25)",
            fontSize: "1rem",
          }}
        />
      </label>
      {error ? <p style={{ color: "#b42318", margin: 0, fontSize: "0.9rem" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !password.trim()}
        style={{
          padding: "0.55rem 1rem",
          borderRadius: 8,
          border: "1px solid rgba(13,58,29,0.35)",
          background: "rgba(13,58,29,0.12)",
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
