/** Shared cooldown for set-password / access emails (recover flow). */
export const ACCESS_EMAIL_COOLDOWN_SEC = 45;

/**
 * Supabase does not tell the browser whether the address exists — the API can succeed even when no mail is sent.
 */
export const ACCESS_EMAIL_SENT_MESSAGE =
  "If an account exists for this email, we’ve sent a login link. Please check your inbox and spam folder.";

export const ACCESS_EMAIL_SENDING_LABEL = "Sending email...";

/** Primary label when resend is allowed (matches button on `/access`). */
export const ACCESS_EMAIL_RESEND_BUTTON_LABEL = "Send Me A New Link";

/** Cooldown label — includes exact seconds (same as ACCESS_EMAIL_COOLDOWN_SEC after send, e.g. 45). */
export function accessEmailResendCooldownLabel(cooldownSec: number): string {
  return `Wait ${cooldownSec}s, then try again`;
}

/** Secondary / cooldown label for the same recover-email action */
export function accessEmailResendButtonLabel(cooldownSec: number, busy: boolean): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return accessEmailResendCooldownLabel(cooldownSec);
  return ACCESS_EMAIL_RESEND_BUTTON_LABEL;
}
