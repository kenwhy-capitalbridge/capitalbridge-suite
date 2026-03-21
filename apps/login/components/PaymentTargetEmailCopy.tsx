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
    <p className={`text-sm leading-relaxed text-cb-green/80 ${className}`.trim()}>
      Registered Email: {emailMark}.
    </p>
  );
}

/** Subtle tertiary control — navigates to checkout to change email. */
export function NotYourEmailChangeButton({
  checkoutPlan,
}: {
  checkoutPlan?: string | null;
}) {
  const href =
    checkoutPlan && checkoutPlan.trim()
      ? `/checkout?plan=${encodeURIComponent(checkoutPlan.trim())}`
      : "/checkout";

  return (
    <div className="mt-3 flex justify-center">
      <a
        href={href}
        className="inline-flex items-center justify-center rounded-lg border border-cb-green/20 bg-white/90 px-3 py-2 text-xs font-medium text-cb-green/85 shadow-sm transition hover:border-cb-gold/45 hover:bg-cb-cream hover:text-cb-green focus:outline-none focus-visible:ring-2 focus-visible:ring-cb-gold/35"
      >
        Not Your Email? Change It
      </a>
    </div>
  );
}

/** @deprecated Use NotYourEmailChangeButton */
export const NotYourEmailChangeLink = NotYourEmailChangeButton;
