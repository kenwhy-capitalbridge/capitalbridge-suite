/**
 * In-process sliding-window rate limits (best-effort; per server instance).
 * For strict global limits, add Redis / Vercel KV later.
 */

function prune(ts: number[], windowMs: number): number[] {
  const cut = Date.now() - windowMs;
  return ts.filter((t) => t > cut);
}

function hit(map: Map<string, number[]>, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = prune(map.get(key) ?? [], windowMs);
  if (arr.length >= limit) {
    map.set(key, arr);
    return false;
  }
  arr.push(now);
  map.set(key, arr);
  return true;
}

const mintByBill = new Map<string, number[]>();
const mintByIp = new Map<string, number[]>();
const recoverByBill = new Map<string, number[]>();
const recoverByIp = new Map<string, number[]>();
const setupEmailByBill = new Map<string, number[]>();
const setupEmailByIp = new Map<string, number[]>();

/** Mint recovery token: per bill_id */
export const MINT_LIMIT_PER_BILL = 24;
export const MINT_WINDOW_MS = 15 * 60 * 1000;

/** Mint recovery token: per client IP */
export const MINT_LIMIT_PER_IP = 80;
export const MINT_IP_WINDOW_MS = 60 * 60 * 1000;

/** Execute recovery: per bill_id */
export const RECOVER_LIMIT_PER_BILL = 10;
export const RECOVER_BILL_WINDOW_MS = 60 * 60 * 1000;

/** Execute recovery: per client IP */
export const RECOVER_LIMIT_PER_IP = 40;
export const RECOVER_IP_WINDOW_MS = 60 * 60 * 1000;

export function allowMintToken(billId: string, ip: string): boolean {
  if (!hit(mintByBill, billId, MINT_LIMIT_PER_BILL, MINT_WINDOW_MS)) return false;
  if (!hit(mintByIp, ip, MINT_LIMIT_PER_IP, MINT_IP_WINDOW_MS)) return false;
  return true;
}

export function allowRecoverAttempt(billId: string, ip: string): boolean {
  if (!hit(recoverByBill, billId, RECOVER_LIMIT_PER_BILL, RECOVER_BILL_WINDOW_MS)) return false;
  if (!hit(recoverByIp, ip, RECOVER_LIMIT_PER_IP, RECOVER_IP_WINDOW_MS)) return false;
  return true;
}

/** POST send-setup-email-for-bill: per bill_id */
export const SETUP_EMAIL_LIMIT_PER_BILL = 36;
export const SETUP_EMAIL_BILL_WINDOW_MS = 60 * 60 * 1000;

/** POST send-setup-email-for-bill: per client IP */
export const SETUP_EMAIL_LIMIT_PER_IP = 120;
export const SETUP_EMAIL_IP_WINDOW_MS = 60 * 60 * 1000;

export function allowSendSetupEmailForBill(billId: string, ip: string): boolean {
  if (!hit(setupEmailByBill, billId, SETUP_EMAIL_LIMIT_PER_BILL, SETUP_EMAIL_BILL_WINDOW_MS)) return false;
  if (!hit(setupEmailByIp, ip, SETUP_EMAIL_LIMIT_PER_IP, SETUP_EMAIL_IP_WINDOW_MS)) return false;
  return true;
}
