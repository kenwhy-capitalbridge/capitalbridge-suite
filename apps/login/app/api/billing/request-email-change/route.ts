import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

/** In-place auth email change; lookup is always by `bill_id` → billing row, never by email alone. */

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

export async function POST(req: Request) {
  let body: { bill_id?: unknown; new_email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const billId = String(body.bill_id ?? "").trim();
  const newEmail = normalizeEmail(String(body.new_email ?? ""));

  if (!billId) {
    return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const svc = createServiceClient();

  const { data: sessionByBill } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, status, user_id, membership_id")
    .eq("bill_id", billId)
    .maybeSingle();

  let userId: string | null = null;
  let oldEmail: string | null = null;
  let recordMode: "billing_sessions" | "pending_bills" | null = null;

  if (sessionByBill) {
    recordMode = "billing_sessions";
    oldEmail = sessionByBill.email ? normalizeEmail(sessionByBill.email) : null;
    if (sessionByBill.user_id) {
      userId = sessionByBill.user_id;
    } else if (oldEmail) {
      const { data: listData } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId =
        listData?.users?.find((u) => normalizeEmail(u.email ?? "") === oldEmail)?.id ?? null;
    }
  } else {
    const { data: pendingBill } = await svc
      .schema("public")
      .from("pending_bills")
      .select("id, email, plan_id, created_at")
      .eq("billplz_bill_id", billId)
      .maybeSingle();

    if (pendingBill?.email) {
      recordMode = "pending_bills";
      oldEmail = normalizeEmail(pendingBill.email);
      const { data: listData } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId =
        listData?.users?.find((u) => normalizeEmail(u.email ?? "") === oldEmail)?.id ?? null;
    }
  }

  if (!userId || !recordMode) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (oldEmail && newEmail === oldEmail) {
    return NextResponse.json({ error: "same_email" }, { status: 400 });
  }

  const { error: updateErr } = await svc.auth.admin.updateUserById(userId, {
    email: newEmail,
  });

  if (updateErr) {
    return NextResponse.json(
      { error: "update_failed", message: updateErr.message },
      { status: 400 }
    );
  }

  if (recordMode === "billing_sessions") {
    await svc.schema("public").from("billing_sessions").update({ email: newEmail }).eq("bill_id", billId);
  } else {
    await svc
      .schema("public")
      .from("pending_bills")
      .update({ email: newEmail })
      .eq("billplz_bill_id", billId);
  }

  return NextResponse.json({ ok: true });
}
