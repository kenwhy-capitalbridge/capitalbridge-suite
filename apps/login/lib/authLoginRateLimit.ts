/**
 * In-process rate limits for login-related APIs (best-effort; per server instance).
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

const userExistsByEmail = new Map<string, number[]>();
const userExistsByIp = new Map<string, number[]>();
const otherSessionsByEmail = new Map<string, number[]>();
const otherSessionsByIp = new Map<string, number[]>();
const completeLoginByUser = new Map<string, number[]>();
const completeLoginByIp = new Map<string, number[]>();

export const RATE_LIMIT_MESSAGE = "Please wait before trying again";

/** Pre-login email checks */
export const USER_EXISTS_LIMIT_EMAIL = 30;
export const USER_EXISTS_WINDOW_MS = 15 * 60 * 1000;
export const USER_EXISTS_LIMIT_IP = 120;
export const USER_EXISTS_IP_WINDOW_MS = 15 * 60 * 1000;

/** Session conflict probe */
export const OTHER_SESSIONS_LIMIT_EMAIL = 30;
export const OTHER_SESSIONS_WINDOW_MS = 15 * 60 * 1000;
export const OTHER_SESSIONS_LIMIT_IP = 120;
export const OTHER_SESSIONS_IP_WINDOW_MS = 15 * 60 * 1000;

/** Post sign-in */
export const COMPLETE_LOGIN_LIMIT_USER = 40;
export const COMPLETE_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const COMPLETE_LOGIN_LIMIT_IP = 200;
export const COMPLETE_LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;

export function allowUserExistsCheck(email: string, ip: string): boolean {
  const e = email.trim().toLowerCase();
  if (!hit(userExistsByEmail, e, USER_EXISTS_LIMIT_EMAIL, USER_EXISTS_WINDOW_MS)) return false;
  if (!hit(userExistsByIp, ip, USER_EXISTS_LIMIT_IP, USER_EXISTS_IP_WINDOW_MS)) return false;
  return true;
}

export function allowOtherSessionsCheck(email: string, ip: string): boolean {
  const e = email.trim().toLowerCase();
  if (!hit(otherSessionsByEmail, e, OTHER_SESSIONS_LIMIT_EMAIL, OTHER_SESSIONS_WINDOW_MS)) return false;
  if (!hit(otherSessionsByIp, ip, OTHER_SESSIONS_LIMIT_IP, OTHER_SESSIONS_IP_WINDOW_MS)) return false;
  return true;
}

export function allowCompleteLogin(userId: string, ip: string): boolean {
  if (!hit(completeLoginByUser, userId, COMPLETE_LOGIN_LIMIT_USER, COMPLETE_LOGIN_WINDOW_MS)) return false;
  if (!hit(completeLoginByIp, ip, COMPLETE_LOGIN_LIMIT_IP, COMPLETE_LOGIN_IP_WINDOW_MS)) return false;
  return true;
}
