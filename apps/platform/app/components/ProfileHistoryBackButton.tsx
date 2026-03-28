"use client";

import { useRouter } from "next/navigation";

export function ProfileHistoryBackButton() {
  const router = useRouter();

  return (
    <div style={{ margin: "clamp(1.25rem, 3.5vw, 1.75rem) 0 0" }}>
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back to the previous page"
        style={{
          minHeight: 44,
          padding: "clamp(0.42rem, 1.4vw, 0.45rem) clamp(0.85rem, 2.5vw, 1.1rem)",
          fontSize: "clamp(0.68rem, 2vw, 0.72rem)",
          fontWeight: 700,
          letterSpacing: "clamp(0.04em, 0.5vw, 0.06em)",
          color: "rgba(13, 58, 29, 0.95)",
          backgroundColor: "rgba(255, 204, 106, 0.92)",
          border: "1px solid rgba(255, 204, 106, 0.55)",
          borderRadius: 4,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        {"<-- BACK"}
      </button>
    </div>
  );
}
