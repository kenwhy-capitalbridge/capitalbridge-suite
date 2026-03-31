import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY } from "./legalMonocopy";
import { formatReportGeneratedAtLabel } from "./reportIdentity";

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
}): ReportAuditMeta {
  const now = args.now ?? new Date();
  const version = nextReportExportVersion();
  const seed = `${args.modelCode}|${args.userDisplayName}|${now.getTime()}|${Math.random().toString(36).slice(2, 11)}`;
  const reportId = buildReportId(args.modelCode, seed);
  const filename = buildCapitalBridgePdfFilename({
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
    generatedAtLabel: formatReportGeneratedAtLabel(now),
    modelDisplayName: args.modelDisplayName ?? CB_REPORT_MODEL_DISPLAY_NAME[args.modelCode],
  };
}
