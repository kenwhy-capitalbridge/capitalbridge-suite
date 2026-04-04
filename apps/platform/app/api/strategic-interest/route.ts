import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@cb/db-types/database";
import { NextResponse } from "next/server";
import { createAppServerClient } from "@cb/supabase/server";
import {
  notifyStrategicInterestAdmin,
  type NotifyAdminResult,
} from "@/lib/strategicInterestAdminNotify";

type StrategicInterestBody = {
  fullName?: string | null;
  reportId?: string | null;
  country?: string;
  /** @deprecated optional legacy field; prefer `message` */
  interestType?: string | null;
  /** Optional commentary from the subscriber (replaces interest dropdown). */
  message?: string | null;
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

const SUBSCRIBER_MESSAGE_MAX = 8000;

function sanitizeSubscriberMessage(raw: unknown): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.normalize("NFKC").trim();
  if (!t) return null;
  return t.length > SUBSCRIBER_MESSAGE_MAX ? t.slice(0, SUBSCRIBER_MESSAGE_MAX) : t;
}

type StrategicInterestInsert = Database["public"]["Tables"]["strategic_interest"]["Insert"];

/** PostgREST 400 when the request references a column missing from the table or API schema cache. */
function isRecoverableSchemaMismatchError(error: PostgrestError): boolean {
  const code = String(error.code ?? "");
  const msg = (error.message ?? "").toLowerCase();
  if (code === "PGRST204") return true;
  if (msg.includes("schema cache") && msg.includes("column")) return true;
  if (msg.includes("could not find") && msg.includes("column")) return true;
  return false;
}

/** If `subscriber_message` column is missing, preserve the note in `interest_type`. */
function foldedInterestType(
  subscriberMessage: string | null,
  interestTypeLegacy: string | null,
): string | null {
  if (subscriberMessage) {
    const prefix = "Subscriber message: ";
    const cap = 6000;
    let body = subscriberMessage;
    if (prefix.length + body.length > cap) {
      body = `${body.slice(0, cap - prefix.length - 1)}…`;
    }
    return `${prefix}${body}`;
  }
  return interestTypeLegacy || null;
}

function buildStrategicInterestInsertAttempts(args: {
  userId: string;
  reportId: string | null;
  country: string;
  subscriberMessage: string | null;
  interestTypeLegacy: string | null;
  contactPhone: string | null;
}): StrategicInterestInsert[] {
  const { userId, reportId, country, subscriberMessage, interestTypeLegacy, contactPhone } = args;
  const folded = foldedInterestType(subscriberMessage, interestTypeLegacy);

  const base = (extra: StrategicInterestInsert): StrategicInterestInsert => ({
    user_id: userId,
    country,
    ...extra,
  });

  // 1) Preferred: dedicated column + pipeline fields (omit keys we do not need — unknown columns → PostgREST 400).
  const full: StrategicInterestInsert = base({
    report_id: reportId,
    status: "new",
    ...(subscriberMessage
      ? { subscriber_message: subscriberMessage, interest_type: null }
      : { interest_type: interestTypeLegacy || null }),
    ...(contactPhone ? { contact_phone: contactPhone } : {}),
  });

  // 2) No subscriber_message column — store note in interest_type
  const foldedWithPhoneStatus: StrategicInterestInsert = base({
    report_id: reportId,
    interest_type: folded,
    status: "new",
    ...(contactPhone ? { contact_phone: contactPhone } : {}),
  });

  // 3) No contact_phone column
  const foldedWithStatus: StrategicInterestInsert = base({
    report_id: reportId,
    interest_type: folded,
    status: "new",
  });

  // 4) No status column (pre–pipeline migration)
  const foldedWithPhone: StrategicInterestInsert = base({
    report_id: reportId,
    interest_type: folded,
    ...(contactPhone ? { contact_phone: contactPhone } : {}),
  });

  // 5) Oldest shape
  const minimal: StrategicInterestInsert = base({
    report_id: reportId,
    interest_type: folded,
  });

  return [full, foldedWithPhoneStatus, foldedWithStatus, foldedWithPhone, minimal];
}

export const dynamic = "force-dynamic";

async function resolveSubmitterDisplayName(
  client: SupabaseClient<Database>,
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
  const { data: prof } = await client
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
    const subscriberMessage = sanitizeSubscriberMessage(body.message);
    const interestTypeLegacy = body.interestType ? String(body.interestType).trim() : null;

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }
    if (!body.consentReview || !body.consentContact) {
      return NextResponse.json({ error: "Both consent checkboxes are required" }, { status: 400 });
    }

    const reportId = body.reportId ? String(body.reportId).trim() : null;
    const contactPhone = sanitizeContactPhone(body.contactPhone);

    // Session client → `authenticated` in Supabase logs; matches RLS `strategic_interest_own_insert`.
    const attempts = buildStrategicInterestInsertAttempts({
      userId: user.id,
      reportId,
      country,
      subscriberMessage,
      interestTypeLegacy,
      contactPhone,
    });

    let insertedRows: { created_at: string }[] | null = null;
    let lastError: PostgrestError | null = null;

    for (let i = 0; i < attempts.length; i++) {
      const { data, error } = await supabase
        .schema("public")
        .from("strategic_interest")
        .insert(attempts[i])
        .select("created_at");

      if (!error) {
        insertedRows = data;
        if (i > 0) {
          console.warn(
            "[strategic-interest POST] insert succeeded using fallback shape",
            JSON.stringify({ attemptIndex: i }),
          );
        }
        break;
      }

      lastError = error;
      const recoverable = isRecoverableSchemaMismatchError(error);
      console.error(
        "[strategic-interest POST] insert attempt failed",
        JSON.stringify({
          attemptIndex: i,
          recoverable,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }),
      );

      if (!recoverable) break;
    }

    if (lastError && !insertedRows?.length) {
      return NextResponse.json({ error: "Unable to save priority access request" }, { status: 500 });
    }

    const inserted = insertedRows?.[0];
    const submittedAtIso = inserted?.created_at ?? new Date().toISOString();
    if (!inserted?.created_at) {
      console.warn(
        "[strategic-interest POST] post-insert select returned no created_at; using server time (check grants / RLS / schema)",
      );
    }

    const fullName = await resolveSubmitterDisplayName(supabase, user, body.fullName);
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
      interestType: subscriberMessage ? null : interestTypeLegacy || null,
      subscriberMessage,
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
