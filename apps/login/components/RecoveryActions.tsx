"use client";

type RecoveryActionsProps = {
  onSendNewLink: () => void;
  sendLinkLabel?: string;
  disabled?: boolean;
  className?: string;
};

/** Resend access link (recovery path below main login actions). */
export function RecoveryActions({
  onSendNewLink,
  sendLinkLabel = "Send A New Link",
  disabled = false,
  className = "",
}: RecoveryActionsProps) {
  return (
    <div className={`mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-center sm:gap-3 ${className}`}>
      <button
        type="button"
        className="cb-btn-secondary w-full font-semibold sm:w-auto sm:min-w-[10rem]"
        onClick={onSendNewLink}
        disabled={disabled}
      >
        {sendLinkLabel}
      </button>
    </div>
  );
}
