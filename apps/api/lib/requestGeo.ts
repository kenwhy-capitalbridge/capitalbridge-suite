import "server-only";

/**
 * ISO 3166-1 alpha-2 from common edge / proxy headers (Vercel, Cloudflare, App Engine).
 */
export function parseRequestCountryCode(req: Request): string | null {
  const h = req.headers;
  const country =
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    h.get("x-appengine-country") ??
    "";
  const u = country.trim().toUpperCase();
  return u.length === 2 ? u : null;
}
