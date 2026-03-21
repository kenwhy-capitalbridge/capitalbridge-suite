/**
 * Persists checkout email so /access, payment-return, and expired-link flows can pre-fill it.
 * Best-effort only (private mode / quota may block storage).
 */
export const CHECKOUT_EMAIL_STORAGE_KEY = "cb_checkout_email";

/** Billplz bill id — stable payment handle; survives email corrections (unlike email-only keys). */
export const CHECKOUT_BILLPLZ_BILL_ID_KEY = "cb_billplz_bill_id";

export function persistCheckoutEmail(email: string): void {
  try {
    const t = email.trim();
    if (!t || typeof localStorage === "undefined") return;
    localStorage.setItem(CHECKOUT_EMAIL_STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
}

export function readPersistedCheckoutEmail(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(CHECKOUT_EMAIL_STORAGE_KEY);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

export function persistBillplzBillId(billId: string): void {
  try {
    const t = billId.trim();
    if (!t || typeof localStorage === "undefined") return;
    localStorage.setItem(CHECKOUT_BILLPLZ_BILL_ID_KEY, t);
  } catch {
    /* ignore */
  }
}

export function readPersistedBillplzBillId(): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(CHECKOUT_BILLPLZ_BILL_ID_KEY);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

/** Build `/access` URL with optional redirect and email (for pre-fill). */
export function buildAccessUrl(params: { redirectTo?: string; email?: string | null }): string {
  const q = new URLSearchParams();
  if (params.redirectTo?.trim()) q.set("redirectTo", params.redirectTo.trim());
  if (params.email?.trim()) q.set("email", params.email.trim());
  const qs = q.toString();
  return qs ? `/access?${qs}` : "/access";
}
