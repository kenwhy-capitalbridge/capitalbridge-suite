/** Shared cooldown for set-password / access emails (recover flow). */
export const ACCESS_EMAIL_COOLDOWN_SEC = 45;

export const ACCESS_EMAIL_SENT_MESSAGE = "Email sent. Check your inbox to set your password.";

export const ACCESS_EMAIL_SENDING_LABEL = "Sending email...";

/** Secondary / cooldown label for the same recover-email action */
export function accessEmailResendButtonLabel(cooldownSec: number, busy: boolean): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return `Resend in ${cooldownSec}s`;
  return "Send password link again";
}
