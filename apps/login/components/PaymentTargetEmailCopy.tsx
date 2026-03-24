/**
 * Shared copy for payment return / handoff / access resend flows: registered checkout email.
 */

export function PaymentTargetEmailLine({
  email,
  variant: _variant,
  className = "",
}: {
  email: string | null | undefined;
  /** @deprecated Kept for call-site compatibility; display is always "Registered email:" */
  variant?: "pending" | "sent";
  className?: string;
}) {
  const em = email?.trim();
  if (!em) return null;

  const lower = em.toLowerCase();

  return (
    <p className={`text-left text-xs leading-relaxed text-cb-green/80 sm:text-sm ${className}`.trim()}>
      Registered email:{" "}
      <a href={`mailto:${lower}`} className="cb-link font-bold text-cb-green underline">
        {lower}
      </a>
    </p>
  );
}
