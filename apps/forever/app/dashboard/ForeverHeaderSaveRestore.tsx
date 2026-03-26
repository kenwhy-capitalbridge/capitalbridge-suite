"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@cb/advisory-graph/supabaseClient";
import {
  fetchPersona,
  deriveEntitlements,
  startSession,
  saveReport,
  listReports,
  getReport,
  type ModelType,
} from "@cb/advisory-graph";
import { useForeverCalculatorContext } from "../ForeverCalculatorProvider";

const MODEL_TYPE: ModelType = "forever-income";
const LIMIT = 20;
const useV2 = process.env.NEXT_PUBLIC_USE_V2 === "1";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatTimestamp(iso);
  } catch {
    return iso;
  }
}

type Props = {
  userId: string;
  /** From server: active membership + plans.slug (avoids trial when persona RPC/client session is wrong). */
  serverCanSave?: boolean;
};

/**
 * Compact Save + load snapshot dropdown for the fixed model header (next to Back).
 */
export function ForeverHeaderSaveRestore({ userId, serverCanSave = false }: Props) {
  const { getHandlers, registered } = useForeverCalculatorContext();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(serverCanSave);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [items, setItems] = useState<{ id: string; created_at: string }[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectValue, setSelectValue] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!userId || !useV2) return;
    fetchPersona(supabase).then((p) => {
      const fromClient = deriveEntitlements(p?.active_plan ?? null).canSaveToServer;
      setCanSave(serverCanSave || fromClient);
    });
  }, [supabase, userId, serverCanSave]);

  useEffect(() => {
    if (!userId || !useV2) return;
    startSession(supabase, userId).then((out) => {
      if ("id" in out) setSessionId(out.id);
    });
  }, [supabase, userId]);

  const loadList = useCallback(async () => {
    if (!userId || !useV2) return;
    setLoadingList(true);
    const list = await listReports(supabase, userId, MODEL_TYPE, LIMIT);
    setItems(list);
    setSelectValue("");
    setLoadingList(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadList();
  }, [loadList, refreshToken]);

  const handleSave = useCallback(async () => {
    if (!useV2 || !sessionId || !userId || !canSave) return;
    const h = getHandlers();
    if (!h) return;
    setSaveStatus("saving");
    const out = await saveReport(supabase, {
      sessionId,
      userId,
      modelType: MODEL_TYPE,
      inputs: h.getInputs(),
      results: h.getResults(),
    });
    if ("error" in out) {
      console.warn("[forever] saveReport error:", out.error);
      setSaveStatus("error");
      return;
    }
    setSaveStatus("ok");
    setRefreshToken((n) => n + 1);
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [supabase, sessionId, userId, canSave, getHandlers]);

  const handleLoad = useCallback(
    async (id: string) => {
      const h = getHandlers();
      if (!h || !id) return;
      const report = await getReport(supabase, id);
      if (!report) return;
      h.applyInputs(report.inputs);
    },
    [getHandlers, supabase]
  );

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

  if (!canSave) {
    return (
      <span
        style={{
          fontSize: "0.55rem",
          color: "rgba(255,204,106,0.55)",
          maxWidth: 100,
          textAlign: "right",
          lineHeight: 1.2,
        }}
        title="Paid membership required for server save."
      >
        Trial
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
        disabled={saveStatus === "saving" || !sessionId || !registered}
        style={{
          padding: "0.28rem 0.5rem",
          fontSize: "0.54rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
          background: "rgba(255,204,106,0.92)",
          border: "1px solid rgba(255,204,106,0.55)",
          borderRadius: 4,
          color: "rgba(13, 58, 29, 0.95)",
          whiteSpace: "nowrap",
        }}
        title={
          !registered
            ? "Open the calculator on this page first"
            : "Save current inputs to your account"
        }
      >
        {saveStatus === "saving" ? "…" : saveStatus === "ok" ? "Saved" : "Save"}
      </button>

      <select
        aria-label="Load saved snapshot"
        value={selectValue}
        disabled={loadingList || items.length === 0}
        onChange={async (e) => {
          const id = e.target.value;
          setSelectValue(id);
          if (!id) return;
          await handleLoad(id);
        }}
        style={{
          minWidth: 0,
          maxWidth: "min(42vw, 200px)",
          padding: "0.26rem 0.35rem",
          fontSize: "0.52rem",
          borderRadius: 4,
          border: "1px solid rgba(255,204,106,0.35)",
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "rgba(246,245,241,0.95)",
          cursor: items.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        <option value="">{loadingList ? "…" : items.length === 0 ? "No saves" : "Load…"}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {formatTimestamp(item.created_at)} · {relativeTime(item.created_at)}
          </option>
        ))}
      </select>

      {saveStatus === "error" && (
        <span style={{ fontSize: "0.5rem", color: "#ffb3b3" }} title="See console">
          !
        </span>
      )}
    </div>
  );
}
