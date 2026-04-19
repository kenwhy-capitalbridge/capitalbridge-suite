import { Suspense } from "react";
import { StagingAccessForm } from "./StagingAccessForm";

export const dynamic = "force-dynamic";

export default function StagingAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[#B8B5AE]">
          Loading…
        </div>
      }
    >
      <StagingAccessForm />
    </Suspense>
  );
}
