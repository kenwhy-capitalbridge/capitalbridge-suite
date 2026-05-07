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
  resolveHrefOnClick,
}: {
  href: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
  style?: CSSProperties;
  resolveHrefOnClick?: (fallbackHref: string) => string;
}) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (allowDefaultBrowserNavigation(e)) return;
      e.preventDefault();
      if (pending) return;
      setPending(true);
      const target = resolveHrefOnClick?.(href) ?? href;
      window.location.assign(target);
    },
    [href, pending, resolveHrefOnClick]
  );

  const mergedStyle: CSSProperties = {
    ...style,
    ...(pending
      ? {
          display: "inline-flex",
          pointerEvents: "none",
          opacity: 0.9,
          justifyContent: "center",
          alignItems: "center",
          minWidth: "max(2.65rem, var(--pf-header-auth-size, 26px))",
          transform: "none",
          position: "relative",
          overflow: "visible",
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
        <span className="cb-pending-btn-inner">
          <ChromeSpinnerGlyph sizePx={14} />
          <span className="cb-visually-hidden">{children}</span>
        </span>
      ) : (
        children
      )}
    </a>
  );
}
