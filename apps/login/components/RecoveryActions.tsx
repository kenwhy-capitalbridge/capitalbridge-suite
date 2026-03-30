"use client";

import { ButtonSpinner } from "./ButtonSpinner";

type RecoveryActionsProps = {
  onSendNewLink: () => void;
  sendLinkLabel?: string;
  disabled?: boolean;
  /** True while the resend request is in flight */
  loading?: boolean;
  className?: string;
};

/** Resend access link (recovery path below main login actions). */
export function RecoveryActions({
  onSendNewLink,
  sendLinkLabel = "Send A New Link",
  disabled = false,
  loading = false,
  className = "",
}: RecoveryActionsProps) {
  const inactive = disabled || loading;
  return (
    <div className={`mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-center sm:gap-3 ${className}`}>
      <button
        type="button"
        className="cb-btn-secondary w-full font-semibold sm:w-auto sm:min-w-[10rem]"
        onClick={onSendNewLink}
        disabled={inactive}
        aria-busy={loading}
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-0">
            <ButtonSpinner className="border-cb-green/25 border-t-cb-green" />
            <span className="cb-visually-hidden">{sendLinkLabel}</span>
          </span>
        ) : (
          sendLinkLabel
        )}
      </button>
    </div>
  );
}
