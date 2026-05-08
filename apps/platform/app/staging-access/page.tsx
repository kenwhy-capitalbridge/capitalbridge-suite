import { Suspense } from "react";
import { StagingAccessForm } from "./StagingAccessForm";

export const dynamic = "force-dynamic";

export default function StagingAccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-col items-center justify-center px-4"
          style={{ backgroundColor: "#0D3A1D", color: "rgba(246,245,241,0.65)" }}
        >
          <p className="text-xs uppercase tracking-[0.16em]">Loading…</p>
        </div>
      }
    >
      <StagingAccessForm />
    </Suspense>
  );
}
