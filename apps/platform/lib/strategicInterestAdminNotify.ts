/**
 * Admin alert for `strategic_interest` submissions (platform `/api/strategic-interest`).
 * Uses Resend HTTP API — set RESEND_API_KEY and RESEND_FROM in env (see root `.env.example`).
 */

const RESEND_API = "https://api.resend.com/emails";

export type StrategicInterestNotifyPayload = {
  adminTo: string;
  from: string;
  fullName: string;
  email: string;
  country: string;
  reportId: string | null;
  interestType: string | null;
  userId: string;
  submittedAtIso: string;
};

export type NotifyAdminResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing_api_key" | "missing_resend_from" }
  | { status: "failed"; reason: string };

function buildPlainText(p: StrategicInterestNotifyPayload): string {
  return [
    "New Strategic Execution / strategic_interest submission",
    "",
    `Name: ${p.fullName}`,
    `Email: ${p.email}`,
    `Country: ${p.country}`,
    `Report ID: ${p.reportId ?? "(none)"}`,
    `Interest type: ${p.interestType ?? "(not specified)"}`,
    `User ID: ${p.userId}`,
    `Timestamp: ${p.submittedAtIso}`,
  ].join("\n");
}

function buildHtml(p: StrategicInterestNotifyPayload): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#0d3a1d;">${esc(k)}</td><td style="padding:6px 0;">${esc(v)}</td></tr>`;
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;font-size:15px;color:#10261b;line-height:1.5;">
<p style="margin:0 0 12px;"><strong>Strategic interest submission</strong></p>
<table style="border-collapse:collapse;">${row("Name", p.fullName)}${row("Email", p.email)}${row("Country", p.country)}${row("Report ID", p.reportId ?? "—")}${row("Interest type", p.interestType ?? "—")}${row("User ID", p.userId)}${row("Timestamp", p.submittedAtIso)}</table>
</body></html>`;
}

/**
 * Sends admin notification. Does not throw — returns status for logging.
 */
export async function notifyStrategicInterestAdmin(p: StrategicInterestNotifyPayload): Promise<NotifyAdminResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { status: "skipped", reason: "missing_api_key" };
  }
  if (!p.from.trim()) {
    return { status: "skipped", reason: "missing_resend_from" };
  }

  const subject = `[Capital Bridge] Strategic interest — ${p.country} — ${p.email}`;

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: p.from,
        to: [p.adminTo],
        subject,
        text: buildPlainText(p),
        html: buildHtml(p),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const raw = await res.text();
    if (!res.ok) {
      return { status: "failed", reason: `Resend HTTP ${res.status}: ${raw.slice(0, 500)}` };
    }
    return { status: "sent" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: "failed", reason: message };
  }
}
