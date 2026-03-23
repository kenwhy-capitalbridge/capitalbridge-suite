/** Shared cooldown for set-password / access emails (recover flow). */
export const ACCESS_EMAIL_COOLDOWN_SEC = 45;

/**
 * Supabase does not tell the browser whether the address exists — the API can succeed even when no mail is sent.
 * Be honest so users check spam, wait, and verify the email matches signup.
 */
export const ACCESS_EMAIL_SENT_MESSAGE =
  "If an account exists for this email, we’ve sent a link to set your password. Check your inbox and spam — it can take a few minutes. If nothing arrives, confirm you’re using the same email you used to sign up, then try again after the wait.";

export const ACCESS_EMAIL_SENDING_LABEL = "Sending email...";

/** Secondary / cooldown label for the same recover-email action */
export function accessEmailResendButtonLabel(cooldownSec: number, busy: boolean): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return `Wait ${cooldownSec}s, then try again`;
  return "Send Me A New Link";
}
