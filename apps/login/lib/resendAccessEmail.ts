/** Shared cooldown for set-password / access emails (recover flow). */
export const ACCESS_EMAIL_COOLDOWN_SEC = 45;

/** After successful send (e.g. forgot-password). First line only; pair with timing hint where required. */
export const ACCESS_EMAIL_SENT_MESSAGE = "Email sent. Check your inbox.";

export const ACCESS_EMAIL_SENDING_LABEL = "Sending email...";

/** Primary label when resend is allowed (matches button on `/access`). */
export const ACCESS_EMAIL_RESEND_BUTTON_LABEL = "Send A New Link";

/** Cooldown label — exact wording with seconds. */
export function accessEmailResendCooldownLabel(cooldownSec: number): string {
  return `You can resend in ${cooldownSec} seconds`;
}

/** Secondary / cooldown label for the same recover-email action */
export function accessEmailResendButtonLabel(cooldownSec: number, busy: boolean): string {
  if (busy) return ACCESS_EMAIL_SENDING_LABEL;
  if (cooldownSec > 0) return accessEmailResendCooldownLabel(cooldownSec);
  return ACCESS_EMAIL_RESEND_BUTTON_LABEL;
}
