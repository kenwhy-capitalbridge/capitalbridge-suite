import "server-only";

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
    throw new Error(`Billplz create bill failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { id: string; url: string };
  return { billId: data.id, checkoutUrl: data.url };
}

