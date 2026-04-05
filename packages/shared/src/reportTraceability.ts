import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY } from "./legalMonocopy";
import {
  formatAdvisoryReportExportZoneLabel,
  marketIdToReportExportTimeZone,
  type MarketId,
} from "./markets";
import { formatReportGeneratedAtLabel } from "./reportIdentity";

export { CB_REPORT_EXPORT_TIMEZONE_KUALA_LUMPUR } from "./reportIdentity";

/** Footer on every exported / printed report page (same text as site `CbLegalSiteFooter`). */
export const CB_REPORT_LEGAL_NOTICE = CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY;

export type CbReportModelCode = "STRESS" | "INCOME" | "HEALTH" | "FOREVER";

export const CB_REPORT_MODEL_FILE_LABEL: Record<CbReportModelCode, string> = {
  STRESS: "CapitalStress",
  INCOME: "IncomeEngineering",
  HEALTH: "CapitalHealth",
  FOREVER: "ForeverIncome",
};

export const CB_REPORT_MODEL_DISPLAY_NAME: Record<CbReportModelCode, string> = {
  STRESS: "Capital Stress Model",
  INCOME: "Income Engineering Model",
  HEALTH: "Capital Health Model",
  FOREVER: "Forever Income Model",
};

/** Public audit fields embedded in PDFs / printouts. */
export type ReportAuditMeta = {
  reportId: string;
  versionLabel: string;
  filename: string;
  generatedAt: Date;
  generatedAtLabel: string;
  modelDisplayName: string;
  /** e.g. `SG · GMT+8` — advisory market + offset when Forever v6 export uses profile zone */
  reportExportZoneLabel?: string;
};

function fnv1a32Hex(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}

export function buildReportId(modelCode: CbReportModelCode, seed: string): string {
  return `CB-${modelCode}-${fnv1a32Hex(seed)}`;
}

export function sanitizePdfFilenameSegment(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return (s.length > 0 ? s : "Client").slice(0, 48);
}

export function formatPdfTimestampParts(d: Date): { datePart: string; timePart: string } {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { datePart: `${y}${m}${day}`, timePart: `${h}${min}` };
}

/** IANA zone for filename date/time segments (STEP 10). */
export function formatPdfTimestampPartsInTimeZone(
  d: Date,
  timeZone: string,
): { datePart: string; timePart: string } {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const y = map.year ?? "";
  const m = map.month ?? "";
  const day = map.day ?? "";
  const h = map.hour ?? "";
  const min = map.minute ?? "";
  return { datePart: `${y}${m}${day}`, timePart: `${h}${min}` };
}

const FOREVER_V6_MODEL_FILE_SEGMENT = "Forever-Income-Model";

/**
 * STEP 10 — `Trial_CapitalBridge_Forever-Income-Model_…` when plan is trial; MY timezone in date/time parts.
 */
export function buildForeverV6CapitalBridgePdfFilename(args: {
  userDisplayName: string;
  versionLabel: string;
  generatedAt: Date;
  timeZone: string;
  planSlug: string;
}): string {
  const { datePart, timePart } = formatPdfTimestampPartsInTimeZone(args.generatedAt, args.timeZone);
  const user = sanitizePdfFilenameSegment(args.userDisplayName);
  const ver = args.versionLabel.startsWith("v") ? args.versionLabel : `v${args.versionLabel}`;
  const core = `CapitalBridge_${FOREVER_V6_MODEL_FILE_SEGMENT}_${user}_${datePart}_${timePart}_${ver}.pdf`;
  const trial = args.planSlug.toLowerCase().trim() === "trial";
  return trial ? `Trial_${core}` : core;
}

/** Cover line — user local wall time only; no timezone name shown. */
export function formatForeverCoverGeneratedLabel(d: Date, timeZone: string): string {
  const tz = timeZone.trim() || "UTC";
  try {
    const datePart = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: tz,
    });
    const timePart = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
    return `${datePart} at ${timePart}`;
  } catch {
    const datePart = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const timePart = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
    return `${datePart} at ${timePart}`;
  }
}

/**
 * Forever Income v6 report PDF filename (locked spec).
 * Trial: `Trial_Forever-Income-Model-YYYY-MM-DD_HHmm-Report.pdf`
 * Paid: `Forever-Income-Model-YYYY-MM-DD_HHmm-Report.pdf`
 */
export function buildForeverIncomeModelReportFilename(args: {
  planSlug: string;
  createdAt: Date;
  timeZone: string;
}): string {
  const tz = args.timeZone.trim() || "UTC";
  const isTrial = String(args.planSlug ?? "").toLowerCase().trim() === "trial";
  let y = "";
  let mo = "";
  let day = "";
  let h = "";
  let min = "";
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(args.createdAt);
    const m: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") m[p.type] = p.value;
    }
    y = m.year ?? "";
    mo = m.month ?? "";
    day = m.day ?? "";
    h = m.hour ?? "";
    min = m.minute ?? "";
  } catch {
    const u = args.createdAt.toISOString();
    y = u.slice(0, 4);
    mo = u.slice(5, 7);
    day = u.slice(8, 10);
    h = u.slice(11, 13);
    min = u.slice(14, 16);
  }
  const stamp = `${y}-${mo}-${day}_${h}${min}`;
  const base = `Forever-Income-Model-${stamp}-Report.pdf`;
  return isTrial ? `Trial_${base}` : base;
}

export function buildCapitalBridgePdfFilename(args: {
  modelCode: CbReportModelCode;
  userDisplayName: string;
  versionLabel: string;
  generatedAt: Date;
}): string {
  const { datePart, timePart } = formatPdfTimestampParts(args.generatedAt);
  const model = CB_REPORT_MODEL_FILE_LABEL[args.modelCode];
  const user = sanitizePdfFilenameSegment(args.userDisplayName);
  const ver = args.versionLabel.startsWith("v") ? args.versionLabel : `v${args.versionLabel}`;
  return `CapitalBridge_${model}_${user}_${datePart}_${timePart}_${ver}.pdf`;
}

export type ReportExportVersion = { major: number; minor: number; label: string };

const SESSION_INIT = "cb_report_export_session_init_v1";
const SS_MAJOR = "cb_report_export_major";
const SS_MINOR = "cb_report_export_minor";
const LS_LAST_MAJOR = "cb_report_last_session_major";

/**
 * Session = browser tab. First export in tab: v{major}.0; each further export: v{major}.1, v{major}.2, …
 * New tab: major increments (v2.0, v3.0, …).
 */
export function nextReportExportVersion(): ReportExportVersion {
  if (typeof window === "undefined") {
    return { major: 1, minor: 0, label: "v1.0" };
  }
  if (!sessionStorage.getItem(SESSION_INIT)) {
    sessionStorage.setItem(SESSION_INIT, "1");
    const lastMajor = parseInt(localStorage.getItem(LS_LAST_MAJOR) ?? "0", 10);
    const major = (Number.isFinite(lastMajor) ? lastMajor : 0) + 1;
    localStorage.setItem(LS_LAST_MAJOR, String(major));
    sessionStorage.setItem(SS_MAJOR, String(major));
    sessionStorage.setItem(SS_MINOR, "0");
  }
  const major = parseInt(sessionStorage.getItem(SS_MAJOR) ?? "1", 10);
  const minor = parseInt(sessionStorage.getItem(SS_MINOR) ?? "0", 10);
  sessionStorage.setItem(SS_MINOR, String(minor + 1));
  return { major, minor, label: `v${major}.${minor}` };
}

export function createReportAuditMeta(args: {
  modelCode: CbReportModelCode;
  userDisplayName: string;
  modelDisplayName?: string;
  now?: Date;
  /**
   * STEP 10 (Forever v6): hyphenated model segment, optional `Trial_` prefix, profile-driven IANA zone in
   * filename + `generatedAtLabel`, plus `reportExportZoneLabel` (market code · GMT offset).
   * Only applies when `modelCode === "FOREVER"`.
   */
  foreverV6Export?: { planSlug: string; advisoryMarketId?: MarketId; timeZone?: string };
}): ReportAuditMeta {
  const now = args.now ?? new Date();
  const version = nextReportExportVersion();
  const seed = `${args.modelCode}|${args.userDisplayName}|${now.getTime()}|${Math.random().toString(36).slice(2, 11)}`;
  const reportId = buildReportId(args.modelCode, seed);

  const v6 = args.foreverV6Export && args.modelCode === "FOREVER" ? args.foreverV6Export : undefined;
  const marketId = v6 ? (v6.advisoryMarketId ?? "MY") : undefined;
  const tz =
    v6 && marketId !== undefined
      ? (v6.timeZone ?? marketIdToReportExportTimeZone(marketId))
      : undefined;
  const zoneLabel =
    v6 && marketId !== undefined && tz !== undefined
      ? formatAdvisoryReportExportZoneLabel(marketId, tz, now)
      : undefined;

  const filename = v6
    ? buildForeverV6CapitalBridgePdfFilename({
        userDisplayName: args.userDisplayName,
        versionLabel: version.label,
        generatedAt: now,
        timeZone: tz!,
        planSlug: v6.planSlug,
      })
    : buildCapitalBridgePdfFilename({
        modelCode: args.modelCode,
        userDisplayName: args.userDisplayName,
        versionLabel: version.label,
        generatedAt: now,
      });

  return {
    reportId,
    versionLabel: version.label,
    filename,
    generatedAt: now,
    generatedAtLabel: tz ? formatReportGeneratedAtLabel(now, { timeZone: tz }) : formatReportGeneratedAtLabel(now),
    modelDisplayName: args.modelDisplayName ?? CB_REPORT_MODEL_DISPLAY_NAME[args.modelCode],
    reportExportZoneLabel: zoneLabel,
  };
}
