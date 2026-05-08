import { Suspense } from "react";
import { StagingAccessForm } from "./StagingAccessForm";

export const dynamic = "force-dynamic";

export default function StagingAccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 16,
            paddingRight: 16,
            backgroundColor: "#0D3A1D",
            color: "rgba(246,245,241,0.65)",
          }}
        >
          <p style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>Loading…</p>
        </div>
      }
    >
      <StagingAccessForm />
    </Suspense>
  );
}
