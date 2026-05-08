"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { HeaderBrandPicture } from "@cb/ui";
import { StagingAccessBackdrop } from "./StagingAccessBackdrop";

const GOLD = "#FFCC6A";
const WHITE = "#F6F5F1";
const GREEN = "#0D3A1D";

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
    <div className="relative isolate flex min-h-screen flex-col">
      <StagingAccessBackdrop />

      <main
        className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6"
        style={{ color: WHITE }}
      >
        <div
          className="w-full max-w-[440px]"
          style={{
            borderRadius: 17,
            border: "1px solid rgba(255, 204, 106, 0.42)",
            background: "linear-gradient(180deg, rgba(13, 58, 29, 0.96) 0%, rgba(7, 38, 20, 0.94) 100%)",
            boxShadow:
              "0 24px 64px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 204, 106, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
            padding: "clamp(28px, 5vw, 36px)",
          }}
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <a
              href="https://thecapitalbridge.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex opacity-95 transition-opacity hover:opacity-100"
              aria-label="Capital Bridge home"
            >
              <HeaderBrandPicture />
            </a>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              Preview environment
            </p>
            <h1
              className="text-[clamp(1.65rem,4vw,2rem)] font-semibold leading-tight"
              style={{
                fontFamily: 'var(--font-staging-serif), "Roboto Serif", Georgia, serif',
                color: WHITE,
              }}
            >
              Staging access
            </h1>
            <p className="max-w-[34ch] text-[13px] leading-relaxed text-[rgba(246,245,241,0.82)]">
              Enter the staging password to unlock this host. This gate applies only to staging — not production.
            </p>
            <p className="text-[11px] leading-snug text-[rgba(246,245,241,0.55)]">
              After sign-in you&apos;ll continue to <span className="font-medium text-[rgba(246,245,241,0.75)]">{returnLabel}</span>
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(246,245,241,0.55)]">
                Password
              </span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                className="w-full rounded-[12px] px-3.5 py-3 text-[15px] outline-none transition-[border-color,box-shadow] disabled:opacity-60"
                style={{
                  border: "1px solid rgba(255, 204, 106, 0.35)",
                  background: "rgba(4, 22, 14, 0.65)",
                  color: WHITE,
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(255, 204, 106, 0.65)";
                  e.target.style.boxShadow = "0 0 0 1px rgba(255, 204, 106, 0.25), inset 0 2px 8px rgba(0,0,0,0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 204, 106, 0.35)";
                  e.target.style.boxShadow = "inset 0 2px 8px rgba(0,0,0,0.25)";
                }}
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-red-400/35 bg-red-950/40 px-3 py-2 text-[13px] text-red-100">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending || !password.trim()}
              className="w-full rounded-[11px] py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                border: `1px solid ${GOLD}`,
                background: GOLD,
                color: GREEN,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              {pending ? "Checking…" : "Continue"}
            </button>
          </form>

          <div className="mt-8 border-t border-[rgba(255,204,106,0.18)] pt-5">
            <div className="flex flex-col gap-3 text-[10px] leading-relaxed text-[rgba(246,245,241,0.48)] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <p className="max-w-[52ch]">
                © {new Date().getFullYear()} Capital Bridge. Proprietary — unauthorised use prohibited.
              </p>
              <p className="shrink-0 font-bold uppercase tracking-[0.12em]" style={{ color: GOLD }}>
                Private & Confidential
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.18em] text-[rgba(246,245,241,0.35)]">
          Capital Bridge — Staging
        </p>
      </main>
    </div>
  );
}
