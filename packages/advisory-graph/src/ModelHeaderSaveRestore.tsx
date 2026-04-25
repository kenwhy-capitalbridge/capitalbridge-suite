"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";
import { emitCapitalUpdatedDebounced } from "@cb/shared/capitalEvents";
import { formatRollingSaveTimestamp } from "@cb/shared/reportIdentity";
import { deriveEntitlements, type Persona } from "./platformAccess";
import { useModelSaveHandlers } from "./ModelSaveHandlersContext";

const LIMIT = 20;
const useV2 = process.env.NEXT_PUBLIC_USE_V2 === "1";

function formatTimestamp(iso: string): string {
  return formatRollingSaveTimestamp(iso);
}

export type ModelHeaderSaveRestoreProps = {
  userId: string;
  serverCanSave?: boolean;
  initialSessionId?: string | null;
  /** Console / ops prefix, e.g. `[forever]` */
  logTag: string;
};

/**
 * Save + load snapshot controls for `ModelAppHeader` `actions` slot (same-origin `/api/advisory-*`).
 * Persona/entitlements via GET `/api/advisory-persona` (server), not a browser Supabase client.
 */
export function ModelHeaderSaveRestore({
  userId,
  serverCanSave = false,
  initialSessionId = null,
  logTag,
}: ModelHeaderSaveRestoreProps) {
  const { getHandlers } = useModelSaveHandlers();
  const [sessionId, setSessionId] = useState<string | null>(() => initialSessionId ?? null);
  const [canSave, setCanSave] = useState(serverCanSave);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [items, setItems] = useState<{ id: string; created_at: string }[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectValue, setSelectValue] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!userId || !useV2) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/advisory-persona", { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) return;
        const j = (await res.json()) as { persona?: Persona | null };
        const fromClient = deriveEntitlements(j?.persona?.active_plan ?? null).canSaveToServer;
        setCanSave(serverCanSave || fromClient);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, serverCanSave]);

  useEffect(() => {
    if (initialSessionId) {
      setSessionId((prev) => prev ?? initialSessionId);
    }
  }, [initialSessionId]);

  useEffect(() => {
    if (!userId || !useV2 || sessionId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/advisory-session", { method: "POST", credentials: "include" });
      if (cancelled) return;
      if (!res.ok) {
        console.warn(`${logTag} advisory-session HTTP`, res.status);
        return;
      }
      const j = (await res.json()) as { id?: string };
      if (j?.id) setSessionId(j.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionId, logTag]);

  const loadList = useCallback(async () => {
    if (!userId || !useV2) return;
    setLoadingList(true);
    try {
      const res = await fetch(`/api/advisory-report?list=1&limit=${LIMIT}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const j = (await res.json()) as { items?: { id: string; created_at: string }[] };
      setItems(j.items ?? []);
    } finally {
      setSelectValue("");
      setLoadingList(false);
    }
  }, [userId]);

  useEffect(() => {
    loadList();
  }, [loadList, refreshToken]);

  const resolveSessionId = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    const res = await fetch("/api/advisory-session", { method: "POST", credentials: "include" });
    if (!res.ok) return null;
    const j = (await res.json()) as { id?: string };
    const id = j?.id ?? null;
    if (id) setSessionId(id);
    return id;
  }, [sessionId]);

  const handleSave = useCallback(async () => {
    if (!useV2 || !userId || !canSave) return;
    const h = getHandlers();
    if (!h?.getInputs) {
      console.warn(`${logTag} save: dashboard handlers not registered yet — retry after the model loads`);
      setSaveStatus("error");
      window.setTimeout(() => setSaveStatus("idle"), 4000);
      return;
    }
    setSaveStatus("saving");
    const sid = await resolveSessionId();
    if (!sid) {
      console.warn(`${logTag} save: no advisory session`);
      setSaveStatus("error");
      window.setTimeout(() => setSaveStatus("idle"), 5000);
      return;
    }
    const inputs = h?.getInputs?.() ?? {};
    const results = h?.getResults?.() ?? {};
    const postSave = async (resultsPayload: Record<string, unknown>, mode: "full" | "inputs_only") =>
      fetch("/api/advisory-report", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-cb-save-mode": mode,
        },
        body: JSON.stringify({
          sessionId: sid,
          inputs,
          results: resultsPayload,
        }),
      });

    let res = await postSave(results, "full");
    if (!res.ok && Object.keys(results).length > 0) {
      // Stress payloads can be large due rich chart/result blobs; retry once with inputs-only.
      console.warn(`${logTag} advisory-report POST full failed; retrying inputs-only`, res.status);
      res = await postSave({}, "inputs_only");
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn(`${logTag} advisory-report POST`, res.status, errBody);
      setSaveStatus("error");
      window.setTimeout(() => setSaveStatus("idle"), 5000);
      return;
    }
    setSaveStatus("ok");
    emitCapitalUpdatedDebounced();
    setRefreshToken((n) => n + 1);
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [userId, canSave, getHandlers, resolveSessionId, logTag]);

  const handleLoad = useCallback(
    async (id: string) => {
      if (!id) return;
      const res = await fetch(`/api/advisory-report?id=${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const report = (await res.json()) as { inputs?: Record<string, unknown> };
      const apply = getHandlers()?.applyInputs;
      if (!apply) {
        console.warn(`${logTag} rolling load skipped: dashboard handlers not registered yet`);
        setSelectValue("");
        return;
      }
      apply(report.inputs ?? {}, { fromRollingSave: true });
    },
    [getHandlers, logTag],
  );

  const trialLocked = !canSave;
  const saveBlocked = saveStatus === "saving" || trialLocked;
  const saveMutedStyle: CSSProperties = {
    background: "rgba(48, 56, 48, 0.98)",
    color: "rgba(170, 176, 170, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    boxShadow: "none",
    opacity: 1,
  };
  const saveActiveStyle: CSSProperties = {
    background: "rgba(255,204,106,0.92)",
    border: "1px solid rgba(255,204,106,0.55)",
    color: "rgba(13, 58, 29, 0.95)",
    opacity: 1,
  };
  const saveGoldHoverStyle: CSSProperties = {
    background: "#0d3a1d",
    border: "1px solid #0d3a1d",
    color: "#f6f5f1",
  };

  if (!useV2) {
    return (
      <span
        style={{
          fontSize: "0.55rem",
          color: "rgba(255,204,106,0.55)",
          maxWidth: 120,
          textAlign: "right",
          lineHeight: 1.2,
        }}
        title="Set NEXT_PUBLIC_USE_V2=1 on this deployment to enable cloud save."
      >
        Save off
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        justifyContent: "flex-end",
        maxWidth: "min(52vw, 320px)",
      }}
    >
      <button
        type="button"
        onClick={handleSave}
        disabled={saveBlocked}
        aria-busy={saveStatus === "saving"}
        aria-label={saveStatus === "saving" ? "Saving snapshot" : undefined}
        className={
          trialLocked
            ? "pf-chrome-gold-btn pf-chrome-gold-btn--header-inline pf-chrome-gold-btn--trial-muted shrink-0"
            : "pf-chrome-gold-btn pf-chrome-gold-btn--header-inline shrink-0"
        }
        style={trialLocked ? undefined : { minWidth: "3.5rem", justifyContent: "center" }}
        title={
          trialLocked
            ? "Trial plan: Save Report is available on paid plans."
            : "Save a snapshot to your account (up to 20 kept; oldest removed when you add a new one). Empty inputs are allowed."
        }
      >
        {trialLocked ? (
          "Save"
        ) : saveStatus === "saving" ? (
          <span className="cb-pending-btn-inner">
            <ChromeSpinnerGlyph sizePx={14} />
          </span>
        ) : saveStatus === "ok" ? (
          "Saved"
        ) : (
          "Save"
        )}
      </button>

      <select
        aria-label="Rolling saves (up to 20 newest)"
        value={selectValue}
        disabled={loadingList || trialLocked}
        onChange={async (e) => {
          if (trialLocked) return;
          const id = e.target.value;
          setSelectValue(id);
          if (!id) return;
          await handleLoad(id);
        }}
        style={{
          minWidth: 0,
          maxWidth: "min(42vw, 200px)",
          padding: "clamp(0.26rem, 0.55vw, 0.32rem) clamp(0.35rem, 0.9vw, 0.5rem)",
          fontSize: "clamp(0.54rem, 2.1vw, 0.65rem)",
          borderRadius: 4,
          border: "1px solid rgba(255,204,106,0.35)",
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "rgba(246,245,241,0.95)",
          cursor: loadingList ? "wait" : trialLocked ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          opacity: trialLocked ? 0.6 : 1,
        }}
        title={trialLocked ? "Trial plan: loading server saves is disabled." : undefined}
      >
        <option value="">{loadingList ? "…" : items.length === 0 ? "No saves" : "Rolling Saves (20)"}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {formatTimestamp(item.created_at)}
          </option>
        ))}
      </select>

      {saveStatus === "error" && (
        <span style={{ fontSize: "0.5rem", color: "#ffb3b3" }} title="See console">
          !
        </span>
      )}
      {trialLocked && (
        <span
          style={{
            fontSize: "0.5rem",
            fontWeight: 700,
            color: "rgba(255,204,106,0.7)",
            letterSpacing: "0.06em",
          }}
          title="Upgrade required"
        >
          TRIAL
        </span>
      )}
    </div>
  );
}
