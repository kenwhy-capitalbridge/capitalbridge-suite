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

const MODEL_TYPE: ModelType = "capital-health";
const useV2 = process.env.NEXT_PUBLIC_USE_V2 === "1";

type AdvisoryShellProps = {
  userId: string;
  getInputs?: () => Record<string, unknown>;
  getResults?: () => Record<string, unknown>;
  children: React.ReactNode;
};

export function AdvisoryShell({
  userId,
  getInputs = () => ({}),
  getResults = () => ({}),
  children,
}: AdvisoryShellProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [reportsRefresh, setReportsRefresh] = useState(0);
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient());
  }, []);
  useEffect(() => {
    if (!supabase || !userId || !useV2) return;
    fetchPersona(supabase).then((p) => setCanSave(deriveEntitlements(p?.active_plan ?? null).canSaveToServer));
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
    const out = await saveReport(supabase, {
      sessionId,
      userId,
      modelType: MODEL_TYPE,
      inputs: getInputs(),
      results: getResults(),
    });
    if ("error" in out) {
      console.warn("[capital-health] saveReport error:", out.error);
      setSaveStatus("error");
      return;
    }
    setSaveStatus("ok");
    setReportsRefresh((n) => n + 1);
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [supabase, sessionId, userId, getInputs, getResults]);

  const handleRestore = useCallback((_inputs: Record<string, unknown>) => {}, []);

  if (!useV2) return <>{children}</>;

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
                {saveStatus === "saving" ? "Saving…" : saveStatus === "ok" ? "Saved" : "Save report on server"}
              </button>
              {saveStatus === "error" && (
                <span style={{ marginLeft: 8, fontSize: "0.8rem", color: "#ffb3b3" }}>Save failed</span>
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
