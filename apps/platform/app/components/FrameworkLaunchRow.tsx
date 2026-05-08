"use client";

import { useCallback, useState } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";

type LaunchItem = { href: string | null; label: string };

/**
 * Replaces static anchor tiles so each launch shows a spinner and disables all sibling launches until navigation completes.
 */
export function FrameworkLaunchRow({ buttons }: { buttons: LaunchItem[] }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const onGo = useCallback(
    (href: string) => {
      if (pendingHref) return;
      setPendingHref(href);
      window.location.assign(href);
    },
    [pendingHref]
  );

  return (
    <div className="cb-module-buttons">
      {buttons.map((b) => {
        const active = Boolean(b.href) && pendingHref === b.href;
        const anyPending = pendingHref !== null;
        const disabled = anyPending || !b.href;
        return (
          <button
            key={`${b.label}:${b.href ?? "pending"}`}
            type="button"
            className="cb-btn"
            disabled={disabled}
            aria-busy={active}
            title={!b.href ? "Staging destination pending" : undefined}
            onClick={() => {
              if (!b.href) return;
              onGo(b.href);
            }}
          >
            {active ? (
              <span className="cb-pending-btn-inner cb-launch-btn-inner">
                <ChromeSpinnerGlyph sizePx={16} />
                <span className="cb-visually-hidden">Loading</span>
              </span>
            ) : (
              b.href ? b.label : `${b.label} (STAGING)`
            )}
          </button>
        );
      })}
    </div>
  );
}
