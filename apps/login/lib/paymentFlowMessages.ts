import { SUPPORT_EMAIL } from "@/lib/sanitizeAuthErrorMessage";

export const PAYMENT_ERROR_NOT_CONFIGURED = "Sign-in is not available in this environment.";

export const PAYMENT_ERROR_SESSION = "We couldn’t verify your session. Please restart from checkout.";

export const PAYMENT_ERROR_RATE_LIMIT =
  "Too many attempts. Please wait a few minutes and try again.";

export const PAYMENT_ERROR_ACTION = "Could not complete this action. Please try again.";

export const PAYMENT_ERROR_EMAIL = "Could not send email. Please try again.";

export const PAYMENT_ERROR_NOT_FOUND =
  "We couldn’t match your payment yet. Please wait a moment and refresh this page.";

/** Linkified by `CalmAuthMessage` when it contains SUPPORT_EMAIL. */
export const PAYMENT_HELP_LINE = `Need help? Contact support at ${SUPPORT_EMAIL}`;

export const HANDOFF_FORBIDDEN_ORIGIN = "Please refresh this page, then try again.";

export const HANDOFF_SUCCESS_EMAIL_SENT = "Password setup email sent. Please check your inbox.";
