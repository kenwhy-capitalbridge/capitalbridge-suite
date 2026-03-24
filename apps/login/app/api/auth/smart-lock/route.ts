import { NextResponse } from "next/server";
import {
  smartLockRecordFailure,
  smartLockRecordSuccess,
  smartLockStatus,
  type SmartLockKind,
} from "@/lib/smartLock";
import { authAnomalyFlag } from "@/lib/authEventLog";

export const runtime = "nodejs";

const KINDS = new Set<SmartLockKind>(["login", "password_setup", "resend", "email_mismatch"]);

/**
 * Attempt-based lock (smartphone-style). Syncs client + server instance.
 */
export async function POST(req: Request) {
  let body: { action?: string; kind?: string; email?: string };
  try {
    body = (await req.json()) as { action?: string; kind?: string; email?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const kind = body.kind as SmartLockKind;
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  if (action === "check") {
    const s = smartLockStatus(kind, email);
    return NextResponse.json({
      locked: s.locked,
      lockUntilMs: s.lockUntilMs,
      failures: s.failures,
      message: s.message,
      attemptsHint: s.attemptsHint,
    });
  }

  if (action === "fail") {
    smartLockRecordFailure(kind, email);
    const s = smartLockStatus(kind, email);
    if (s.failures >= 10) {
      authAnomalyFlag("smart_lock_high_failures", { kind, failures: s.failures });
    }
    return NextResponse.json({
      locked: s.locked,
      lockUntilMs: s.lockUntilMs,
      failures: s.failures,
      message: s.message,
      attemptsHint: s.attemptsHint,
    });
  }

  if (action === "success") {
    smartLockRecordSuccess(kind, email);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
