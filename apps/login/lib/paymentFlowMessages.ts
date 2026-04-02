import { SUPPORT_EMAIL } from "@/lib/sanitizeAuthErrorMessage";

export const PAYMENT_ERROR_NOT_CONFIGURED = "Sign-in is not available here.";

export const PAYMENT_ERROR_SESSION = "Please go back to checkout and try again.";

export const PAYMENT_ERROR_RATE_LIMIT = "Too many attempts. Please wait a few minutes.";

export const PAYMENT_ERROR_ACTION = "Please try again.";

export const PAYMENT_ERROR_EMAIL = "We couldn’t send your email. Please try again.";

export const PAYMENT_ERROR_NOT_FOUND =
  "We’re confirming your payment. Please wait a moment and refresh the page.";

/** Linkified by `CalmAuthMessage` when it contains SUPPORT_EMAIL. */
export const PAYMENT_HELP_LINE = `Need help? Contact support at ${SUPPORT_EMAIL}`;

export const HANDOFF_FORBIDDEN_ORIGIN = "Please refresh this page, then try again.";

export const HANDOFF_SUCCESS_EMAIL_SENT = "Password setup email sent. Please check your inbox.";

export const HANDOFF_PAYMENT_PENDING =
  "Payment has not been confirmed yet. Complete payment first, then check again.";

export const HANDOFF_STATUS_CHECKING = "Checking payment status…";
