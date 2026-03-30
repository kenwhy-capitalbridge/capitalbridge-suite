"use client";

import { useCallback, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
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
  style,
}: {
  href: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
  style?: CSSProperties;
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

  const mergedStyle: CSSProperties = {
    ...style,
    ...(pending
      ? {
          pointerEvents: "none",
          opacity: 0.9,
          justifyContent: "center",
          alignItems: "center",
          minWidth: "3.15rem",
          transform: "none",
        }
      : {}),
  };

  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-busy={pending}
      onClick={onClick}
      style={mergedStyle}
    >
      {pending ? (
        <>
          <ChromeSpinnerGlyph sizePx={14} />
          <span className="cb-visually-hidden">{children}</span>
        </>
      ) : (
        children
      )}
    </a>
  );
}
