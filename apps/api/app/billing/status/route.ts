import { NextResponse } from "next/server";
import { createServiceClient } from "@cb/supabase/service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const billId = url.searchParams.get("bill_id")?.trim();

  if (!billId) {
    return NextResponse.json({ error: "missing_bill_id" }, { status: 400 });
  }

  const svc = createServiceClient();

  const { data: sessionByBill } = await svc
    .schema("public")
    .from("billing_sessions")
    .select("id, email, status, user_id, membership_id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (sessionByBill) {
    let membershipStatus: string | null = null;
    if (sessionByBill.membership_id) {
      const { data: membership } = await svc
        .schema("public")
        .from("memberships")
        .select("status")
        .eq("id", sessionByBill.membership_id)
        .maybeSingle();
      membershipStatus = typeof membership?.status === "string" ? membership.status : null;
    }

    const paymentConfirmed = sessionByBill.status === "paid" || membershipStatus === "active";

    return NextResponse.json({
      mode: "billing_sessions",
      bill_id: billId,
      email: sessionByBill.email,
      billing_status: sessionByBill.status,
      membership_status: membershipStatus,
      account_ready: paymentConfirmed,
      membership_ready: membershipStatus === "active",
      next_step: paymentConfirmed ? "login" : "wait_for_payment",
    });
  }

  const { data: pendingBill } = await svc
    .schema("public")
    .from("pending_bills")
    .select("id, email, plan_id, created_at")
    .eq("billplz_bill_id", billId)
    .maybeSingle();

  if (pendingBill) {
    const { data: listData } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = listData?.users?.find(
      (user) => (user.email ?? "").toLowerCase() === pendingBill.email.toLowerCase()
    );

    return NextResponse.json({
      mode: "pending_bills",
      bill_id: billId,
      email: pendingBill.email,
      pending_bill_id: pendingBill.id,
      account_ready: !!authUser,
      membership_ready: false,
      next_step: authUser ? "login" : "wait_for_webhook",
    });
  }

  return NextResponse.json({
    mode: "not_found",
    bill_id: billId,
    account_ready: false,
    membership_ready: false,
    next_step: "contact_support",
  });
}
