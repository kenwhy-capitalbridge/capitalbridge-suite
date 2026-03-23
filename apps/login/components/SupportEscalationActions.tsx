"use client";

/**
 * Tier 3+ — subtle nudge to chat (Elfsight). Scrolls to page footer anchor.
 */
export function SupportEscalationActions({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="mt-4 text-center sm:mt-5">
      <p className="text-[11px] text-cb-green/65 sm:text-xs">You can also chat with us for help.</p>
      <button
        type="button"
        className="mt-1 text-xs font-medium text-cb-green/90 underline decoration-cb-green/35 underline-offset-[3px] transition hover:decoration-cb-green/60 sm:mt-1.5 sm:text-sm"
        onClick={() => {
          document.getElementById("site-help-footer")?.scrollIntoView({ behavior: "smooth", block: "end" });
        }}
      >
        Open chat
      </button>
    </div>
  );
}
