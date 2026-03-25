"use client";

import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listReports,
  getReport,
  type ModelType,
} from "./platformAccess";

const LIMIT = 20;

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
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
    const now = Date.now();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatTimestamp(iso);
  } catch {
    return iso;
  }
}

export type SavedReportsPanelProps = {
  supabase: SupabaseClient;
  userId: string;
  modelType: ModelType;
  canSaveToServer: boolean;
  onRestore: (inputs: Record<string, unknown>) => void;
  /** Optional: class name for container */
  className?: string;
  /** Bump after a successful save so the list reloads (max 20 rows). */
  refreshToken?: number;
};

export function SavedReportsPanel({
  supabase,
  userId,
  modelType,
  canSaveToServer,
  onRestore,
  className = "",
  refreshToken = 0,
}: SavedReportsPanelProps) {
  const [items, setItems] = useState<{ id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);
  const [selectValue, setSelectValue] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const list = await listReports(supabase, userId, modelType, LIMIT);
    setItems(list);
    setSelectValue("");
    setLoading(false);
  }, [supabase, userId, modelType]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const handleClick = async (id: string, created_at: string) => {
    setError(null);
    const report = await getReport(supabase, id);
    if (!report) {
      setError("Could not load report");
      return;
    }
    onRestore(report.inputs);
    setRestoredMessage(`Restored from ${formatTimestamp(created_at)}`);
    setTimeout(() => setRestoredMessage(null), 3000);
  };

  return (
    <section
      className={className}
      style={{
        padding: 16,
        marginTop: 24,
        border: "1px solid rgba(255,204,106,0.25)",
        borderRadius: 8,
        backgroundColor: "rgba(0,0,0,0.15)",
      }}
      aria-label="Saved reports"
    >
      <div
        style={{
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "rgba(255,204,106,0.9)",
          marginBottom: 8,
        }}
      >
        Saved snapshots ({items.length}/{LIMIT})
      </div>

      {!loading && items.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="saved-report-select"
            style={{
              display: "block",
              fontSize: "0.75rem",
              color: "rgba(246,245,241,0.75)",
              marginBottom: 6,
            }}
          >
            Load saved inputs (date &amp; time)
          </label>
          <select
            id="saved-report-select"
            value={selectValue}
            onChange={async (e) => {
              const id = e.target.value;
              setSelectValue(id);
              if (!id) return;
              const item = items.find((x) => x.id === id);
              if (item) await handleClick(item.id, item.created_at);
            }}
            style={{
              width: "100%",
              maxWidth: 420,
              padding: "10px 12px",
              fontSize: "0.85rem",
              borderRadius: 6,
              border: "1px solid rgba(255,204,106,0.35)",
              backgroundColor: "rgba(0,0,0,0.25)",
              color: "rgba(246,245,241,0.95)",
              cursor: "pointer",
            }}
          >
            <option value="">— Select —</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {formatTimestamp(item.created_at)} ({relativeTime(item.created_at)})
              </option>
            ))}
          </select>
        </div>
      )}

      {restoredMessage && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "rgba(200,255,200,0.9)",
            marginBottom: 8,
          }}
        >
          {restoredMessage}
        </p>
      )}

      {loading && (
        <p style={{ fontSize: "0.8rem", color: "rgba(246,245,241,0.7)" }}>
          Loading…
        </p>
      )}

      {error && (
        <p style={{ fontSize: "0.8rem", color: "#ffb3b3", marginBottom: 8 }}>
          {error}{" "}
          <button
            type="button"
            onClick={() => load()}
            style={{
              marginLeft: 8,
              padding: "2px 8px",
              cursor: "pointer",
              background: "rgba(255,204,106,0.2)",
              border: "1px solid rgba(255,204,106,0.5)",
              borderRadius: 4,
              color: "#fff",
            }}
          >
            Retry
          </button>
        </p>
      )}

      {!loading && items.length === 0 && (
        <p style={{ fontSize: "0.8rem", color: "rgba(246,245,241,0.7)" }}>
          No saved reports yet.
          {!canSaveToServer && " Server saves are available on paid plans."}
        </p>
      )}

      {!loading && (
        <button
          type="button"
          onClick={() => load()}
          style={{
            marginTop: 12,
            padding: "6px 12px",
            fontSize: "0.8rem",
            cursor: "pointer",
            background: "rgba(255,204,106,0.15)",
            border: "1px solid rgba(255,204,106,0.4)",
            borderRadius: 4,
            color: "rgba(255,204,106,0.95)",
          }}
        >
          Refresh
        </button>
      )}
    </section>
  );
}
