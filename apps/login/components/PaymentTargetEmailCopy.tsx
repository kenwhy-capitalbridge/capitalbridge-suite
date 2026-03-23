/**
 * Shared copy for payment return / handoff / access resend flows: registered checkout email.
 */

export function PaymentTargetEmailLine({
  email,
  variant: _variant,
  className = "",
}: {
  email: string | null | undefined;
  /** @deprecated Kept for call-site compatibility; display is always "Registered Email:" */
  variant?: "pending" | "sent";
  className?: string;
}) {
  const em = email?.trim();
  if (!em) return null;

  const emailMark = <span className="font-bold text-cb-green">{em}</span>;

  return (
    <p className={`text-xs leading-relaxed text-cb-green/80 sm:text-sm ${className}`.trim()}>
      Registered Email: {emailMark}.
    </p>
  );
}
