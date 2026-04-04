"use client";

import { useCallback, useState } from "react";
import type { StrategicInterestAdminRow } from "@/lib/strategicInterestAdminLoad";
import {
  STRATEGIC_INTEREST_STATUSES,
  type StrategicInterestStatus,
} from "@/lib/platformAdmin";

type Row = StrategicInterestAdminRow;

export function StrategicInterestAdminTable({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onStatusChange = useCallback(async (id: string, status: StrategicInterestStatus) => {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/strategic-interest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const body = (await res.json().catch(() => ({}))) as { row?: Row; error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Update failed");
      }
      if (body.row) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...body.row,
                  display_name: r.display_name,
                  profile_email: r.profile_email,
                }
              : r,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }, []);

  return (
    <div>
      {error ? (
        <p style={{ color: "#b42318", marginBottom: 12, fontSize: "0.9rem" }}>{error}</p>
      ) : null}
      <div style={{ overflowX: "auto", border: "1px solid rgba(16,38,27,0.12)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "rgba(13,58,29,0.06)", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontWeight: 600 }}>Name</th>
              <th style={{ padding: "10px 12px", fontWeight: 600 }}>Email</th>
              <th style={{ padding: "10px 12px", fontWeight: 600 }}>Country</th>
              <th style={{ padding: "10px 12px", fontWeight: 600 }}>Message</th>
              <th style={{ padding: "10px 12px", fontWeight: 600 }}>Created</th>
              <th style={{ padding: "10px 12px", fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "1.25rem", color: "rgba(16,38,27,0.65)" }}>
                  No submissions yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid rgba(16,38,27,0.08)" }}>
                  <td style={{ padding: "10px 12px" }}>{r.display_name}</td>
                  <td style={{ padding: "10px 12px" }}>{r.profile_email}</td>
                  <td style={{ padding: "10px 12px" }}>{r.country}</td>
                  <td
                    style={{
                      padding: "10px 12px",
                      maxWidth: 280,
                      verticalAlign: "top",
                      wordBreak: "break-word",
                      color: "rgba(16,38,27,0.85)",
                    }}
                  >
                    {r.subscriber_message?.trim() || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <select
                      aria-label={`Status for ${r.display_name}`}
                      value={r.status}
                      disabled={pendingId === r.id}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (STRATEGIC_INTEREST_STATUSES.includes(v as StrategicInterestStatus)) {
                          void onStatusChange(r.id, v as StrategicInterestStatus);
                        }
                      }}
                      style={{
                        minWidth: 140,
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(16,38,27,0.2)",
                        background: "#fff",
                      }}
                    >
                      {STRATEGIC_INTEREST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
