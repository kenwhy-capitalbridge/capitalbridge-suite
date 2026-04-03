import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import { createServiceClient } from "@cb/supabase/service";
import {
  notifyStrategicInterestAdmin,
  type NotifyAdminResult,
} from "@/lib/strategicInterestAdminNotify";

type StrategicInterestBody = {
  fullName?: string | null;
  reportId?: string | null;
  country?: string;
  interestType?: string | null;
  contactPhone?: string | null;
  consentReview?: boolean;
  consentContact?: boolean;
};

/** Optional; allows country codes (+), spaces, parentheses, hyphens. Drops other chars; min 5 digits or omitted. */
function sanitizeContactPhone(raw: unknown): string | null {
  if (raw == null || typeof raw !== "string") return null;
  let s = raw.normalize("NFKC").trim();
  if (!s) return null;
  s = s.replace(/[^\d+\s().-]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 5) return null;
  if (s.length > 40) s = s.slice(0, 40);
  return s;
}

export const dynamic = "force-dynamic";

async function resolveSubmitterDisplayName(
  svc: ReturnType<typeof createServiceClient>,
  user: User,
  bodyFullName?: string | null
): Promise<string> {
  const trimmed = bodyFullName?.trim();
  if (trimmed) return trimmed;
  const meta =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    "";
  if (meta) return meta;
  const { data: prof } = await svc
    .schema("public")
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  const fn = prof?.first_name?.trim() ?? "";
  const ln = prof?.last_name?.trim() ?? "";
  if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
  return user.email?.trim() || "Unknown";
}

function logAdminNotifyIncomplete(userId: string, result: NotifyAdminResult): void {
  if (result.status === "sent") return;
  const reason = result.status === "failed" || result.status === "skipped" ? result.reason : "";
  console.error(
    "[strategic-interest POST] admin email not sent",
    JSON.stringify({ userId, notifyStatus: result.status, reason }),
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createAppServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as StrategicInterestBody;
    const country = String(body.country ?? "").trim().toUpperCase();
    const interestType = body.interestType ? String(body.interestType).trim() : null;

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }
    if (!body.consentReview || !body.consentContact) {
      return NextResponse.json({ error: "Both consent checkboxes are required" }, { status: 400 });
    }

    const svc = createServiceClient();
    const reportId = body.reportId ? String(body.reportId).trim() : null;
    const contactPhone = sanitizeContactPhone(body.contactPhone);

    const { data: inserted, error } = await svc
      .schema("public")
      .from("strategic_interest")
      .insert({
        user_id: user.id,
        report_id: reportId,
        country,
        interest_type: interestType,
        contact_phone: contactPhone,
      })
      .select("created_at")
      .single();

    if (error) {
      console.error("[strategic-interest POST] insert failed", error.message);
      return NextResponse.json({ error: "Unable to save priority access request" }, { status: 500 });
    }

    const submittedAtIso = inserted?.created_at ?? new Date().toISOString();
    const fullName = await resolveSubmitterDisplayName(svc, user, body.fullName);
    const userEmail = user.email?.trim() ?? "";

    const adminTo = (process.env.STRATEGIC_INTEREST_ADMIN_EMAIL ?? "admin@thecapitalbridge.com").trim();
    const from = (process.env.RESEND_FROM ?? "").trim();

    const notifyResult = await notifyStrategicInterestAdmin({
      adminTo,
      from,
      fullName,
      email: userEmail || "—",
      country,
      reportId,
      interestType,
      contactPhone,
      userId: user.id,
      submittedAtIso,
    });

    logAdminNotifyIncomplete(user.id, notifyResult);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[strategic-interest POST] unexpected error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
