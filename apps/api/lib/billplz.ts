import "server-only";
import { createHmac } from "crypto";

export function getBillplzConfig() {
  const apiKey = process.env.BILLPLZ_API_KEY;
  const collectionId = process.env.BILLPLZ_COLLECTION_ID;
  const callbackUrl = process.env.BILLPLZ_CALLBACK_URL; // optional
  if (!apiKey || !collectionId) {
    throw new Error("Missing BILLPLZ_API_KEY or BILLPLZ_COLLECTION_ID");
  }
  return { apiKey, collectionId, callbackUrl };
}

export async function createBillplzBill(params: {
  amountCents: number;
  description: string;
  email: string;
  name: string;
  reference1: string; // membership_id
  redirectUrl?: string;
}) {
  const { apiKey, collectionId, callbackUrl } = getBillplzConfig();

  const body = new URLSearchParams();
  body.set("collection_id", collectionId);
  body.set("email", params.email);
  body.set("name", params.name);
  body.set("amount", String(params.amountCents));
  body.set("description", params.description);
  body.set("reference_1_label", "membership_id");
  body.set("reference_1", params.reference1);
  if (params.redirectUrl) body.set("redirect_url", params.redirectUrl);
  if (callbackUrl) body.set("callback_url", callbackUrl);

  const basic = Buffer.from(`${apiKey}:`).toString("base64");
  const resp = await fetch("https://www.billplz.com/api/v3/bills", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("[billplz] create bill failed", { status: resp.status, statusText: resp.statusText, body: text });
    const err = new Error(`Billplz create bill failed (${resp.status}): ${text}`) as Error & { status?: number; body?: string };
    err.status = resp.status;
    err.body = text;
    throw err;
  }

  const data = (await resp.json()) as { id: string; url: string };
  return { billId: data.id, checkoutUrl: data.url };
}

/**
 * Verify Billplz callback X-Signature (HMAC-SHA256 over sorted key+value pairs).
 * See Billplz API doc: X Signature Callback URL, STEP 1 & 2.
 * If BILLPLZ_X_SIGNATURE_KEY is not set, returns true (verification skipped).
 */
export function verifyBillplzWebhookSignature(
  body: Record<string, unknown>,
  signatureFromRequest: string | null
): boolean {
  const secret = process.env.BILLPLZ_X_SIGNATURE_KEY ?? process.env.BILLPLZ_API_KEY;
  if (!secret || !signatureFromRequest?.trim()) {
    return !process.env.BILLPLZ_X_SIGNATURE_KEY;
  }
  const excluded = new Set(["x_signature", "billplz[x_signature]"]);
  const entries = Object.entries(body)
    .filter(([k]) => !excluded.has(k.toLowerCase()))
    .map(([k, v]) => [k, String(v ?? "")] as [string, string]);
  entries.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
  const sourceString = entries.map(([k, v]) => `${k}${v}`).join("|");
  const expected = createHmac("sha256", secret).update(sourceString).digest("hex");
  return expected === signatureFromRequest.trim();
}

