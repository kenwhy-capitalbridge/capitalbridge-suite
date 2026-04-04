"use client";

export function AdminGateSignOut() {
  return (
    <p style={{ margin: "0 0 1rem", fontSize: "0.85rem" }}>
      <button
        type="button"
        onClick={() => {
          void (async () => {
            await fetch("/api/admin/gate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ logout: true }),
            });
            window.location.href =
              "/admin/login?next=%2Fadmin%2Flogin%2Fstrategic";
          })();
        }}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "#0d3a1d",
          textDecoration: "underline",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        Sign out admin gate
      </button>
    </p>
  );
}
