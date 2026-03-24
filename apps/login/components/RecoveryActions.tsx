"use client";

type RecoveryActionsProps = {
  onTryAgain: () => void;
  onSendNewLink: () => void;
  tryAgainLabel?: string;
  sendLinkLabel?: string;
  disabled?: boolean;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  className?: string;
};

/**
 * Unified recovery: primary retry + secondary resend (Plan B).
 */
export function RecoveryActions({
  onTryAgain,
  onSendNewLink,
  tryAgainLabel = "Try Again",
  sendLinkLabel = "Send A New Link",
  disabled = false,
  primaryDisabled,
  secondaryDisabled,
  className = "",
}: RecoveryActionsProps) {
  const p = disabled || primaryDisabled;
  const s = disabled || secondaryDisabled;
  return (
    <div className={`mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-center sm:gap-3 ${className}`}>
      <button
        type="button"
        className="cb-btn-primary w-full font-semibold sm:w-auto sm:min-w-[10rem]"
        onClick={onTryAgain}
        disabled={p}
      >
        {tryAgainLabel}
      </button>
      <button
        type="button"
        className="cb-btn-secondary w-full font-semibold sm:w-auto sm:min-w-[10rem]"
        onClick={onSendNewLink}
        disabled={s}
      >
        {sendLinkLabel}
      </button>
    </div>
  );
}
