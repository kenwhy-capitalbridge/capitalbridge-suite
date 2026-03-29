"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

type LaunchItem = { href: string; label: string };

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
        const active = pendingHref === b.href;
        const anyPending = pendingHref !== null;
        return (
          <button
            key={b.href}
            type="button"
            className="cb-btn"
            disabled={anyPending}
            aria-busy={active}
            onClick={() => onGo(b.href)}
          >
            {active ? (
              <span className="cb-launch-btn-inner">
                <Loader2
                  className="cb-ui-icon-spin"
                  size={16}
                  strokeWidth={2.25}
                  aria-hidden
                />
                Loading…
              </span>
            ) : (
              b.label
            )}
          </button>
        );
      })}
    </div>
  );
}
