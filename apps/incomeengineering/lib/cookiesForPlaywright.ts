/**
 * Map a browser Cookie header to Playwright `addCookies` entries (same-origin PDF capture).
 */
export function cookiesForPlaywright(
  cookieHeader: string | null | undefined,
  origin: string,
): { name: string; value: string; url: string }[] {
  const raw = cookieHeader?.trim();
  if (!raw) return [];
  const base = origin.replace(/\/$/, "");
  const out: { name: string; value: string; url: string }[] = [];
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (!name) continue;
    out.push({ name, value, url: base });
  }
  return out;
}
