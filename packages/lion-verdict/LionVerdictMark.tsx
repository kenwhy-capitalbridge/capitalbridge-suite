"use client";

/** Lion mark for verdict panels; asset from `public/brand/` (sync from packages/ui/src/assets). */
const LIONHEAD_GOLD = "/brand/lionhead_Gold.svg";

export function LionVerdictMark({ className = "h-7 w-7 shrink-0 sm:h-8 sm:w-8" }: { className?: string }) {
  return (
    <img
      src={LIONHEAD_GOLD}
      alt=""
      width={32}
      height={32}
      className={className}
      aria-hidden
      decoding="async"
    />
  );
}
