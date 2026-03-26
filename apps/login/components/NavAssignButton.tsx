"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ButtonSpinner } from "./ButtonSpinner";

type NavAssignButtonProps = {
  href: string;
  className: string;
  children: ReactNode;
  disabled?: boolean;
  onBeforeNavigate?: () => void;
  /** Spinner border colors (Tailwind), e.g. `border-cb-green/30 border-t-cb-green` */
  spinnerClassName?: string;
  /** Shown while navigating; defaults to `children` */
  loadingLabel?: ReactNode;
};

/**
 * Full-page navigation via `location.assign`: disables immediately and shows a spinner until the browser loads the next document.
 */
export function NavAssignButton({
  href,
  className,
  children,
  disabled = false,
  onBeforeNavigate,
  spinnerClassName = "border-cb-green/30 border-t-cb-green",
  loadingLabel,
}: NavAssignButtonProps) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(() => {
    if (pending || disabled) return;
    setPending(true);
    onBeforeNavigate?.();
    window.location.assign(href);
  }, [pending, disabled, href, onBeforeNavigate]);

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onClick}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <ButtonSpinner className={spinnerClassName} />
          {loadingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
