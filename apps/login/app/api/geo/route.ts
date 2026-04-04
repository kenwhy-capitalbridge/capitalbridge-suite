import { NextResponse } from "next/server";
import { marketFromCountryCode, type MarketId } from "@cb/shared/markets";

export const runtime = "nodejs";

/**
 * Returns client region hints from edge headers (Vercel / Cloudflare-style).
 * Used to default pricing market on /pricing.
 */
export async function GET(req: Request) {
  const h = req.headers;
  const country =
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    h.get("x-appengine-country") ??
    "";
  const market: MarketId = marketFromCountryCode(country || null);

  return NextResponse.json(
    { country: country || null, market },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
