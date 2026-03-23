"use client";

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/sanitizeAuthErrorMessage";

/**
 * Renders calm guidance; turns plain `admin@…` into a mailto link.
 */
export function CalmAuthMessage({
  text,
  className = "mt-3 text-sm leading-relaxed text-cb-green",
}: {
  text: string;
  className?: string;
}) {
  if (!text.includes(SUPPORT_EMAIL)) {
    return <p className={className}>{text}</p>;
  }
  const parts = text.split(SUPPORT_EMAIL);
  return (
    <p className={className}>
      {parts[0]}
      <a href={SUPPORT_MAILTO} className="cb-link font-medium underline">
        {SUPPORT_EMAIL}
      </a>
      {parts.slice(1).join(SUPPORT_EMAIL)}
    </p>
  );
}
