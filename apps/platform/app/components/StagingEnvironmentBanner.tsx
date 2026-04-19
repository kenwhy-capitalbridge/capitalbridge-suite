import Link from "next/link";

/**
 * Shown only on the staging Capital Bridge host (see layout + `isStagingCapitalBridgeHost`).
 */
export function StagingEnvironmentBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] flex justify-center px-3 pt-2"
      role="status"
      aria-label="Staging environment"
    >
      <div className="pointer-events-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full border border-[#FFCC6A]/35 bg-[#0D3A1D]/92 px-4 py-1.5 text-center shadow-lg backdrop-blur-sm">
        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFCC6A]">
          Staging
        </span>
        <span className="hidden text-[11px] text-[#F6F5F1]/85 sm:inline">
          Preview only — not live client data or production billing.
        </span>
        <Link
          href="/api/staging-gate/logout"
          className="text-[11px] font-medium text-[#FFCC6A] underline decoration-[#FFCC6A]/50 underline-offset-2 hover:text-[#FFE08A]"
        >
          Clear staging access
        </Link>
      </div>
    </div>
  );
}
