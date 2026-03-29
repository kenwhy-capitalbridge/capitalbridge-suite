import { Suspense } from "react";
import { ButtonSpinner } from "@/components/ButtonSpinner";
import { PricingContent } from "./PricingContent";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <main className="cb-auth-main bg-[#0D3A1D]">
          <p className="text-cb-cream/80">Loading…</p>
          <div className="mt-4 flex justify-center" role="status" aria-busy="true">
            <ButtonSpinner className="h-6 w-6 border-cb-cream/35 border-t-cb-cream sm:h-7 sm:w-7" />
          </div>
        </main>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
