import { Suspense } from "react";
import { PricingContent } from "../pricing/PricingContent";

/** Same plans UI as /pricing; header uses BACK → platform profile (see Header.tsx). */
export default function PlansBrowsePage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main bg-[#0D3A1D]">
          <p className="text-cb-cream/80">Loading…</p>
        </main>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
