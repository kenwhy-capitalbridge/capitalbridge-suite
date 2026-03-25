"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@cb/advisory-graph/supabaseClient";
import {
  fetchPersona,
  deriveEntitlements,
  startSession,
  saveReport,
  type ModelType,
} from "@cb/advisory-graph";
import { SavedReportsPanel } from "@cb/advisory-graph/SavedReportsPanel";

const MODEL_TYPE: ModelType = "forever-income";
const useV2 = process.env.NEXT_PUBLIC_USE_V2 === "1";

type AdvisoryShellProps = {
  userId: string;
  /** Return current form/state inputs for save. Default () => ({}). */
  getInputs?: () => Record<string, unknown>;
  /** Return current results for save. Default () => ({}). */
  getResults?: () => Record<string, unknown>;
  /** When user picks a saved snapshot, rehydrate calculator state from stored inputs. */
  onRestoreInputs?: (inputs: Record<string, unknown>) => void;
  children: React.ReactNode;
};

export function AdvisoryShell({
  userId,
  getInputs = () => ({}),
  getResults = () => ({}),
  onRestoreInputs,
  children,
}: AdvisoryShellProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [reportsRefresh, setReportsRefresh] = useState(0);
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase || !userId || !useV2) return;
    fetchPersona(supabase).then((p) => {
      const e = deriveEntitlements(p?.active_plan ?? null);
      setCanSave(e.canSaveToServer);
    });
  }, [supabase, userId]);

  useEffect(() => {
    if (!supabase || !userId || !useV2) return;
    startSession(supabase, userId).then((out) => {
      if ("id" in out) setSessionId(out.id);
    });
  }, [supabase, userId]);

  const handleSave = useCallback(async () => {
    if (!supabase || !sessionId || !userId) return;
    setSaveStatus("saving");
    const result = saveReport(supabase, {
      sessionId,
      userId,
      modelType: MODEL_TYPE,
      inputs: getInputs(),
      results: getResults(),
    });
    const out = await result;
    if ("error" in out) {
      console.warn("[forever] saveReport error:", out.error);
      setSaveStatus("error");
      return;
    }
    setSaveStatus("ok");
    setReportsRefresh((n) => n + 1);
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [supabase, sessionId, userId, getInputs, getResults]);

  const handleRestore = useCallback(
    (inputs: Record<string, unknown>) => {
      onRestoreInputs?.(inputs);
    },
    [onRestoreInputs]
  );

  if (!useV2) {
    return <>{children}</>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      {children}
      {supabase && userId && (
        <>
          {canSave && sessionId && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                style={{
                  padding: "8px 16px",
                  fontSize: "0.9rem",
                  cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
                  background: "rgba(255,204,106,0.2)",
                  border: "1px solid rgba(255,204,106,0.5)",
                  borderRadius: 6,
                  color: "#fff",
                }}
              >
                {saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "ok"
                    ? "Saved"
                    : "Save report on server"}
              </button>
              {saveStatus === "error" && (
                <span style={{ marginLeft: 8, fontSize: "0.8rem", color: "#ffb3b3" }}>
                  Save failed (check console)
                </span>
              )}
            </div>
          )}
          <SavedReportsPanel
            supabase={supabase}
            userId={userId}
            modelType={MODEL_TYPE}
            canSaveToServer={canSave}
            onRestore={handleRestore}
            refreshToken={reportsRefresh}
          />
        </>
      )}
    </div>
  );
}
