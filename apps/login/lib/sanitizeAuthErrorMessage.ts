/**
 * Single source of truth: calm, action-guiding auth/access copy.
 * Never surface raw Supabase / GoTrue strings — classify + tier only.
 */

export const SUPPORT_EMAIL = "admin@thecapitalbridge.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

/** Plain @ in user-facing sentences (linkify in UI). */
const AT = SUPPORT_EMAIL;

export type TierKind =
  | "link"
  | "resend"
  | "password"
  | "email_change"
  | "network"
  | "rate_limit"
  | "login";

/** 1-based attempt count (increment on each failure for that kind). */
export function tierLevel(attempt: number): 1 | 2 | 3 {
  if (attempt <= 1) return 1;
  if (attempt === 2) return 2;
  return 3;
}

/**
 * Classify raw provider text → override kind (still never shown to users).
 */
export function classifySupabaseRaw(raw: string | null | undefined): "network" | "rate_limit" | undefined {
  const m = (raw ?? "").toLowerCase();
  if (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("email rate limit") ||
    m.includes("too many tries")
  ) {
    return "rate_limit";
  }
  if (
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("connection")
  ) {
    return "network";
  }
  return undefined;
}

export function getTieredCalmMessage(kind: TierKind, attempt: number): string {
  const t = tierLevel(Math.max(1, attempt));

  switch (kind) {
    case "link":
      if (t === 1) return "This link can’t be used anymore. Please request a new one.";
      if (t === 2) return "This link isn’t working. Try requesting a new one.";
      return `Please request a new link or go back to sign in. You can also chat with us for help or email us at ${AT}.`;

    case "resend":
      if (t === 1) return "We couldn’t send the email. Please try again.";
      if (t === 2) return "Still not going through. Please wait a moment and try again.";
      return `Please wait a minute, then try again. You can also chat with us or email ${AT}.`;

    case "password":
      if (t === 1) return "We couldn’t update your password. Please try again.";
      if (t === 2) return "Still not working. Try again or request a new link.";
      return `Please request a new link and try again. You can also chat with us or email ${AT}.`;

    case "email_change":
      if (t === 1) return "We couldn’t update your email. Please try again.";
      if (t === 2) return "Still not working. Please try again in a moment.";
      return `Please try again later or chat with us. You can also email ${AT}.`;

    case "network":
      if (t === 1) return "Connection issue. Please try again.";
      if (t === 2) return "Still not connecting. Check your internet and try again.";
      return "Please check your connection or try again later. You can also chat with us.";

    case "rate_limit":
      if (t === 1) return "Too many tries. Please wait a moment.";
      if (t === 2) return "Please wait a minute before trying again.";
      return "Please wait a few minutes, then try again. If you need help, chat with us.";

    case "login":
      if (t === 1) return "Email or password doesn’t look right. Please try again.";
      if (t === 2) return "Still not correct. Please check and try again.";
      return "Please reset your password or chat with us for help.";

    default:
      return getTieredCalmMessage("link", attempt);
  }
}

/**
 * Pick kind (caller default + optional raw override), return calm tier line.
 */
export function resolveCalmAuthMessage(
  defaultKind: TierKind,
  attempt: number,
  raw?: string | null
): { kind: TierKind; message: string; level: 1 | 2 | 3 } {
  const classified = classifySupabaseRaw(raw);
  const kind: TierKind = classified ?? defaultKind;
  const message = getTieredCalmMessage(kind, attempt);
  return { kind, message, level: tierLevel(Math.max(1, attempt)) };
}

// --- Static copy: access error view & forms (edit here only) ---

export const ACCESS_ERROR_PAGE_TITLE = "This link can’t be used anymore";

export const ACCESS_ERROR_PAGE_SUBTITLE = "Request a new link or go back to sign in.";

export const ACCESS_EMAIL_FIELD_LABEL = "Enter your email";

export const ACCESS_EMAIL_PLACEHOLDER = "Email";

export const ACCESS_PRIMARY_CTA = "Back to sign in";

export const ACCESS_SUPPORT_HINT =
  "Need help? Chat with us or email admin@thecapitalbridge.com";

export const SESSION_SIGNED_OUT_LINE = "You’ve been signed out. Please sign in again.";

export const ACCESS_REMOVED_LINE =
  "Your access is no longer active. Chat with us or email admin@thecapitalbridge.com for help.";

export const FORM_EMPTY_EMAIL = "Please enter your email.";

export const FORM_PASSWORD_TOO_SHORT = "Password is too short.";

export const FORM_PASSWORD_MISMATCH = "Passwords do not match.";

export const FORM_COMPLETE_TO_CONTINUE = "Please complete the form to continue.";

export const LOGIN_PROMPT_THEN_NEW_LINK = "Please enter your email, then tap Send Me A New Link.";

export const FORM_EMAIL_INVALID = "Please enter a valid email.";

export const EMAIL_ON_PAYMENT_SAME = "That’s already the email for this payment.";

export const EMAIL_CHANGE_CHECK_INBOX = "Check your new inbox for a confirmation email to finish the change.";

export const EMAIL_CHANGE_NO_SESSION =
  "To use a different email, start checkout again with the address you want, or sign in if you already have an account.";

export const DEV_PREVIEW_NO_EMAIL = "This preview can’t send email yet. Try the live site.";

export const SET_PASSWORD_EXPIRED_TITLE = "This link can’t be used anymore";

export const SET_PASSWORD_EXPIRED_SUB =
  "Request a new email to set your password. Use the same address you used at checkout.";

export const SET_PASSWORD_EMPTY_EMAIL_FOR_RESEND = "Please enter your email.";
