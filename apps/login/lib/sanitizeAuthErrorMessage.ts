/**
 * Single source of truth: calm, action-guiding auth/access copy.
 * Never surface raw Supabase / GoTrue strings — classify + tier only.
 */

export const SUPPORT_EMAIL = "admin@thecapitalbridge.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

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

  /**
   * These are not “please wait” rate limits — showing “Too many tries” confuses users who only
   * attempted sign-in once (e.g. after an expired magic link is still in the URL hash).
   */
  const looksLikeCredentialOrLinkIssue =
    (m.includes("invalid") &&
      (m.includes("credentials") ||
        m.includes("jwt") ||
        m.includes("token") ||
        m.includes("grant") ||
        m.includes("login"))) ||
    m.includes("expired") ||
    m.includes("otp") ||
    m.includes("access_denied") ||
    m.includes("email link") ||
    m.includes("magic link") ||
    m.includes("link is invalid") ||
    (m.includes("session") && m.includes("invalid"));

  if (looksLikeCredentialOrLinkIssue) {
    return undefined;
  }

  if (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("email rate limit") ||
    m.includes("too many tries") ||
    m.includes("too_many")
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
      if (t === 1) {
        return "This link has expired or has already been used. Please request a new one.";
      }
      if (t === 2) {
        return "This link isn’t working. Please request a new one.";
      }
      return "Request a new link or return to sign in.";

    case "resend":
      if (t === 1) return "We couldn’t send your email. Please try again.";
      if (t === 2) return "Still not sent. Please wait a moment and try again.";
      return "Please wait a moment, then try again. Check your spam folder if needed.";

    case "password":
      if (t === 1) return "We couldn’t update your password. Please try again.";
      if (t === 2) return "Still not working. Request a new link and try again.";
      return "Please request a new link to reset your password.";

    case "email_change":
      if (t === 1) return "We couldn’t update your email. Please try again.";
      if (t === 2) return "Still not working. Please try again in a moment.";
      return "Please try again later.";

    case "network":
      if (t === 1) return "Please check your connection and try again.";
      if (t === 2) return "Still not working. Please try again shortly.";
      return "Please check your connection and try again later.";

    case "rate_limit":
      if (t === 1) return "Too many attempts. Please wait a moment.";
      if (t === 2) return "Please wait a minute, then try again.";
      return "Please wait a few minutes, then try again.";

    case "login":
      if (t === 1) return "Your email or password doesn’t look right. Please try again.";
      if (t === 2) return "Still not working. Please try again or reset your password.";
      return "You can reset your password using “Send A New Link”.";

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

/** First sign-in failure when provider looks like rate-limit (often wrong password or throttle). */
export const LOGIN_SIGNIN_FIRST_TRY_AMBIGUOUS =
  "We couldn’t sign you in. Please try again, or use “Send A New Link” to reset your password.";

export const LOGIN_SIGNIN_RATE_LIMIT_RETRY =
  "Still not working. Please try again or use “Send A New Link” to reset your password.";

export const LOGIN_SIGNIN_RATE_LIMIT_FINAL = "Please wait a few minutes, then try again.";

export function resolveLoginCalmAuthMessage(
  attempt: number,
  raw?: string | null
): { kind: TierKind; message: string; level: 1 | 2 | 3 } {
  const resolved = resolveCalmAuthMessage("login", attempt, raw);
  if (resolved.kind === "rate_limit") {
    if (attempt === 1) {
      return {
        kind: "login",
        message: LOGIN_SIGNIN_FIRST_TRY_AMBIGUOUS,
        level: 1,
      };
    }
    if (attempt === 2) {
      return {
        kind: "login",
        message: LOGIN_SIGNIN_RATE_LIMIT_RETRY,
        level: 2,
      };
    }
    return {
      kind: "login",
      message: LOGIN_SIGNIN_RATE_LIMIT_FINAL,
      level: 3,
    };
  }
  return resolved;
}

// --- Static copy: access error view & forms (edit here only) ---

export const ACCESS_ERROR_PAGE_TITLE = "Something went wrong. Please try again.";

export const ACCESS_ERROR_PAGE_SUBTITLE = "";

export const ACCESS_EMAIL_FIELD_LABEL = "Enter your email:";

export const ACCESS_EMAIL_PLACEHOLDER = "Email";

export const ACCESS_PRIMARY_CTA = "Back to Sign In";

export const ACCESS_SUPPORT_HINT = `Need help? Contact us at ${SUPPORT_EMAIL}`;

export const ACCESS_SUPPORT_ALERT_HINT = "Need help? Contact us as below.";

export const SESSION_SIGNED_OUT_LINE = "You’ve been signed out. Please sign in again.";

export const ACCESS_REMOVED_LINE = "We couldn’t confirm your access. Please try again.";

export const FORM_EMPTY_EMAIL = "Please enter your email.";

export const FORM_PASSWORD_TOO_SHORT = "Your password must be at least 6 characters.";

export const FORM_PASSWORD_MISMATCH = "Your passwords don’t match. Please try again.";

export const FORM_COMPLETE_TO_CONTINUE = "Please complete all fields to continue.";

export const LOGIN_PROMPT_THEN_NEW_LINK = "Enter your email and tap “Reset Password”.";

export const FORM_EMAIL_INVALID = "Please enter a valid email.";

export const EMAIL_ON_PAYMENT_SAME = "This is already the email used for this payment.";

export const EMAIL_CHANGE_CHECK_INBOX = "Check your new email inbox to confirm the change.";

export const EMAIL_CHANGE_NO_SESSION =
  "To use a different email, start again from checkout or sign in with your existing account.";

export const DEV_PREVIEW_NO_EMAIL =
  "Email sending is not available in this environment. Please use the live site.";

export const SET_PASSWORD_EXPIRED_TITLE = "This Link Has Expired";

export const SET_PASSWORD_EXPIRED_SUB = "Request a new link or return to sign in.";

export const SET_PASSWORD_EMPTY_EMAIL_FOR_RESEND = "Please enter your email.";
