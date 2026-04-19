"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function StagingAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const from = searchParams.get("from") || "/";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-[#F6F5F1]">
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-[#FFCC6A]/90">
        Capital Bridge
      </p>
      <h1 className="mb-2 text-center font-serif text-2xl font-bold text-[#FFCC6A]">Staging access</h1>
      <p className="mb-8 text-center text-sm leading-relaxed text-[#B8B5AE]">
        Enter the staging password to continue. This gate applies only to the staging host, not production.
      </p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#FFCC6A]/25 bg-[#0f2e1c]/90 p-6 shadow-xl">
        <label className="block text-xs font-medium text-[#B8B5AE]">
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[#FFCC6A]/30 bg-[#0A2E18] px-3 py-2.5 text-sm text-[#F6F5F1] outline-none ring-0 focus:border-[#FFCC6A]/70"
            disabled={pending}
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || !password.trim()}
          className="w-full rounded-lg bg-[#FFCC6A] py-2.5 text-sm font-bold text-[#0D3A1D] transition-opacity disabled:opacity-50"
        >
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
