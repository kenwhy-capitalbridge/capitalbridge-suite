/**
 * In-process sliding-window limit for POST /billing/admin/recover-email (per client IP).
 * Mitigates brute-force noise and abuse; pair with strong BILLING_ADMIN_RECOVERY_SECRET.
 * For global limits, add Redis / Vercel KV later.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
/** Max requests per IP per window (authenticated + unauthenticated attempts). */
const MAX_PER_IP = 45;

const hitsByIp = new Map<string, number[]>();

function prune(ts: number[]): number[] {
  const cut = Date.now() - WINDOW_MS;
  return ts.filter((t) => t > cut);
}

export function allowAdminRecoverEmailByIp(ip: string): boolean {
  const key = ip.trim() || "unknown";
  const arr = prune(hitsByIp.get(key) ?? []);
  if (arr.length >= MAX_PER_IP) {
    hitsByIp.set(key, arr);
    return false;
  }
  arr.push(Date.now());
  hitsByIp.set(key, arr);
  return true;
}
