"use client";

import { useCallback, useState } from "react";
import type { StrategicBriefingUser } from "@/lib/strategicBriefingLoad";
import { parseUserIdsFromText } from "@/lib/strategicBriefingLoad";

export function StrategicBriefingClient() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefings, setBriefings] = useState<StrategicBriefingUser[] | null>(null);

  const onLoad = useCallback(async () => {
    const userIds = parseUserIdsFromText(text);
    if (userIds.length === 0) {
      setError("Paste at least one user UUID (one per line or comma-separated).");
      setBriefings(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/strategic-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        briefings?: StrategicBriefingUser[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Request failed");
      }
      setBriefings(body.briefings ?? []);
    } catch (e) {
      setBriefings(null);
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [text]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>User IDs (UUID)</span>
          <span style={{ fontSize: "0.82rem", color: "rgba(16,38,27,0.65)" }}>
            One per line or comma-separated. Max 40 users. Loads{" "}
            <code style={{ fontSize: "0.8em" }}>strategic_interest</code> plus latest{" "}
            <code style={{ fontSize: "0.8em" }}>advisory_v2.advisory_reports</code> per model.
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"f8e03552-2ac1-429d-ba05-98a2c7f8fd35\n…"}
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.85rem",
              padding: "0.75rem",
              borderRadius: 8,
              border: "1px solid rgba(16,38,27,0.2)",
            }}
          />
        </label>
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onLoad()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid rgba(16,38,27,0.25)",
              background: "rgba(13,58,29,0.08)",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Loading…" : "Load briefing"}
          </button>
        </div>
      </div>

      {error ? (
        <p style={{ color: "#b42318", fontSize: "0.9rem", margin: 0 }}>{error}</p>
      ) : null}

      {briefings && briefings.length === 0 ? (
        <p style={{ color: "rgba(16,38,27,0.65)" }}>No data for those user IDs (check UUIDs).</p>
      ) : null}

      {briefings?.map((b) => (
        <BriefingCard key={b.user_id} b={b} />
      ))}
    </div>
  );
}

function BriefingCard({ b }: { b: StrategicBriefingUser }) {
  const models = Object.keys(b.latest_reports_by_model);
  return (
    <section
      style={{
        border: "1px solid rgba(16,38,27,0.12)",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        background: "rgba(13,58,29,0.03)",
      }}
    >
      <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>{b.display_name}</h2>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "rgba(16,38,27,0.75)" }}>
        <strong>Email:</strong> {b.profile_email} · <strong>User ID:</strong>{" "}
        <code style={{ fontSize: "0.82em" }}>{b.user_id}</code>
      </p>

      <h3 style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0.75rem 0 0.4rem" }}>
        Strategic interest submissions
      </h3>
      {b.strategic_interests.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(16,38,27,0.6)" }}>None.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.88rem" }}>
          {b.strategic_interests.map((si) => (
            <li key={si.id} style={{ marginBottom: 6 }}>
              <strong>{new Date(si.created_at).toLocaleString()}</strong> · {si.country}
              {si.report_id ? (
                <>
                  {" "}
                  · report_id: <code style={{ fontSize: "0.85em" }}>{si.report_id}</code>
                </>
              ) : null}
              {si.subscriber_message ? (
                <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{si.subscriber_message}</div>
              ) : null}
              {si.contact_phone ? <div style={{ marginTop: 2 }}>Phone: {si.contact_phone}</div> : null}
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0.85rem 0 0.4rem" }}>
        Linked report (report_id on submission)
      </h3>
      {Object.keys(b.linked_reports).length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(16,38,27,0.6)" }}>
          No report_id on submissions, or ID not found in recent report fetch.
        </p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.88rem" }}>
          {Object.entries(b.linked_reports).map(([rid, row]) => (
            <li key={rid} style={{ marginBottom: 8 }}>
              <code style={{ fontSize: "0.85em" }}>{rid}</code>
              {row ? (
                <>
                  {" "}
                  → {row.model_type} @ {new Date(row.created_at).toLocaleString()}
                  <JsonBlock label="inputs" value={row.inputs} />
                  <JsonBlock label="results" value={row.results} />
                </>
              ) : (
                <span style={{ color: "#b42318" }}> (not in last {400} report rows — run SQL or widen limit)</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0.85rem 0 0.4rem" }}>
        Latest saved model snapshots
      </h3>
      {models.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(16,38,27,0.6)" }}>
          No advisory_v2 reports for this user (or not in recent fetch).
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {models.map((m) => {
            const r = b.latest_reports_by_model[m];
            return (
              <div
                key={m}
                style={{
                  border: "1px solid rgba(16,38,27,0.1)",
                  borderRadius: 8,
                  padding: "0.65rem 0.75rem",
                  background: "#fff",
                }}
              >
                <strong>{m}</strong> · {new Date(r.created_at).toLocaleString()} ·{" "}
                <code style={{ fontSize: "0.8em" }}>{r.id}</code>
                <JsonBlock label="inputs" value={r.inputs} />
                <JsonBlock label="results" value={r.results} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const str = JSON.stringify(value, null, 2);
  const truncated = str.length > 12000 ? `${str.slice(0, 12000)}\n… (truncated for browser)` : str;
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", fontSize: "0.82rem" }}>{label}</summary>
      <pre
        style={{
          margin: "0.35rem 0 0",
          fontSize: "0.72rem",
          overflow: "auto",
          maxHeight: 280,
          background: "rgba(16,38,27,0.04)",
          padding: 8,
          borderRadius: 6,
        }}
      >
        {truncated}
      </pre>
    </details>
  );
}
