"use client";

import { useCallback, useState, type MouseEvent, type ReactNode } from "react";
import { ChromeSpinnerGlyph } from "./ChromeSpinnerGlyph";

function allowDefaultBrowserNavigation(e: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  );
}

/**
 * Gold chrome `<a>`: on primary click, show spinner and `location.assign` so the next document load is obvious.
 * Modifier / middle-click keeps normal browser behaviour.
 */
export function ChromePendingNavLink({
  href,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (allowDefaultBrowserNavigation(e)) return;
      e.preventDefault();
      if (pending) return;
      setPending(true);
      window.location.assign(href);
    },
    [href, pending]
  );

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-busy={pending}
      onClick={onClick}
      style={{
        pointerEvents: pending ? "none" : undefined,
        opacity: pending ? 0.9 : undefined,
      }}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <ChromeSpinnerGlyph />
          {children}
        </span>
      ) : (
        children
      )}
    </a>
  );
}
