/**
 * Shared copy for payment return / handoff / resend flows: which inbox receives the set-password email.
 */

export function PaymentTargetEmailLine({
  email,
  variant,
  className = "",
}: {
  email: string | null | undefined;
  variant: "pending" | "sent";
  className?: string;
}) {
  const em = email?.trim();
  if (!em) return null;

  const emailMark = <span className="font-bold text-cb-green">{em}</span>;

  return (
    <p className={`text-sm leading-relaxed text-cb-green/80 ${className}`.trim()}>
      {variant === "sent" ? (
        <>Password email sent to {emailMark}.</>
      ) : (
        <>We&apos;ll send the password email to {emailMark}.</>
      )}
    </p>
  );
}

export function NotYourEmailChangeLink({
  checkoutPlan,
}: {
  /** When set, links to `/checkout?plan=…` so the user can restart with the same plan. */
  checkoutPlan?: string | null;
}) {
  const href =
    checkoutPlan && checkoutPlan.trim()
      ? `/checkout?plan=${encodeURIComponent(checkoutPlan.trim())}`
      : "/checkout";

  return (
    <p className="mt-1.5 text-center text-xs text-cb-green/70">
      <a
        href={href}
        className="font-medium text-cb-green/90 underline decoration-cb-gold/45 underline-offset-2 transition hover:text-cb-green"
      >
        Not your email? Change it
      </a>
    </p>
  );
}
