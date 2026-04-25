import type { LionStatus } from "./arbitration";
import { simpleHash } from "./utils/deterministic";

export type LionMigrationState =
  | "SHADOW"
  | "PARTIAL"
  | "FULL"
  | "ROLLED_BACK"
  | "RECOVERY_MONITORING";

export type LionMigrationConfig = {
  state: LionMigrationState;
  canonicalTrafficPct: number;
};

export const DEFAULT_LION_MIGRATION_CONFIG: LionMigrationConfig = {
  state: "SHADOW",
  canonicalTrafficPct: 0,
};

export type LionMismatchSeverity = "MEDIUM" | "HIGH" | "CRITICAL";

export type LionMismatchCounters = {
  lion_mismatch_total: number;
  lion_mismatch_overstatement_total: number;
  lion_invalid_preconditions_mismatch_total: number;
};

export type LionMismatchEvent = {
  capital_graph_id?: string;
  version?: number;
  model_keys_used: string[];
  canonical_status: LionStatus;
  legacy_status: LionStatus;
  severity: LionMismatchSeverity;
  canonical_signals?: Record<string, string>;
  legacy_summary?: string;
  reasons: string[];
  input_signature: string;
  created_at: string;
};

const STATUS_RANK: Record<LionStatus, number> = {
  STRONG: 1,
  STABLE: 2,
  FRAGILE: 3,
  AT_RISK: 4,
  NOT_SUSTAINABLE: 5,
};

const SAMPLE_RATE = 0.1;

const COUNTERS_KEY = "__CB_LION_MISMATCH_COUNTERS__";

type GlobalWithLionCounters = typeof globalThis & {
  [COUNTERS_KEY]?: LionMismatchCounters;
};

function getMutableLionMismatchCounters(): LionMismatchCounters {
  const globalStore = globalThis as GlobalWithLionCounters;

  globalStore[COUNTERS_KEY] ??= {
    lion_mismatch_total: 0,
    lion_mismatch_overstatement_total: 0,
    lion_invalid_preconditions_mismatch_total: 0,
  };

  return globalStore[COUNTERS_KEY];
}

function parseState(value: string | undefined): LionMigrationState {
  switch (value) {
    case "PARTIAL":
    case "FULL":
    case "ROLLED_BACK":
    case "RECOVERY_MONITORING":
    case "SHADOW":
      return value;
    default:
      return "SHADOW";
  }
}

function parseTrafficPct(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function getLionMigrationConfig(env = process.env): LionMigrationConfig {
  const state = parseState(env.CB_LION_MIGRATION_STATE);
  const canonicalTrafficPct =
    state === "FULL"
      ? 100
      : state === "PARTIAL"
        ? parseTrafficPct(env.CB_LION_CANONICAL_TRAFFIC_PCT)
        : 0;

  return {
    state,
    canonicalTrafficPct,
  };
}

export function shouldServeCanonicalLion(
  inputSignatureValue: string,
  config = getLionMigrationConfig()
): boolean {
  if (config.state === "FULL") return true;
  if (config.state !== "PARTIAL") return false;

  const bucket = simpleHash(inputSignatureValue) % 10_000;
  return bucket < Math.floor((config.canonicalTrafficPct / 100) * 10_000);
}

export function classifyLionMismatchSeverity(
  canonical: LionStatus,
  legacy: LionStatus
): LionMismatchSeverity {
  const diff = Math.abs(STATUS_RANK[canonical] - STATUS_RANK[legacy]);

  if (diff >= 3) return "CRITICAL";
  if (diff === 2) return "HIGH";
  return "MEDIUM";
}

export function inputSignature(input: unknown): string {
  return String(simpleHash(JSON.stringify(input)));
}

export function shouldLogLionMismatch(
  severity: LionMismatchSeverity,
  signature: string,
  sampleRate = SAMPLE_RATE
): boolean {
  if (severity === "CRITICAL") return true;

  const bucket = simpleHash(signature) % 10_000;
  return bucket < Math.floor(sampleRate * 10_000);
}

export function buildLionMismatchEvent(args: {
  capital_graph_id?: string;
  version?: number;
  model_keys_used: string[];
  canonical_status: LionStatus;
  legacy_status: LionStatus;
  canonical_signals?: Record<string, string>;
  legacy_summary?: string;
  reasons?: string[];
  input_signature: string;
  created_at?: string;
  force_log?: boolean;
}): LionMismatchEvent | null {
  if (args.canonical_status === args.legacy_status) return null;

  const severity = classifyLionMismatchSeverity(
    args.canonical_status,
    args.legacy_status
  );

  if (!args.force_log && !shouldLogLionMismatch(severity, args.input_signature)) {
    return null;
  }

  return {
    capital_graph_id: args.capital_graph_id,
    version: args.version,
    model_keys_used: [...args.model_keys_used].sort(),
    canonical_status: args.canonical_status,
    legacy_status: args.legacy_status,
    severity,
    canonical_signals: args.canonical_signals,
    legacy_summary: args.legacy_summary,
    reasons: [...(args.reasons ?? [])].sort(),
    input_signature: args.input_signature,
    created_at: args.created_at ?? "",
  };
}

export function logLionMismatch(event: LionMismatchEvent | null): void {
  if (!event) return;

  // Temporary production audit hook. Replace with DB insert once
  // `capital_lion_mismatches` lands in migrations.
  console.warn("[lion:mismatch]", event);
}

export function isLionStatusOverstatement(args: {
  legacy_status: LionStatus;
  canonical_status: LionStatus;
}): boolean {
  return STATUS_RANK[args.legacy_status] < STATUS_RANK[args.canonical_status];
}

export function getLionMismatchCounters(): LionMismatchCounters {
  return { ...getMutableLionMismatchCounters() };
}

export function recordLionMismatch(args: {
  model_keys_used: string[];
  legacy_status: LionStatus;
  canonical_status: LionStatus;
  agreement_level?: string;
  canonical_signals?: Record<string, string>;
  legacy_summary?: string;
  reasons?: string[];
  input_signature: string;
  legacy_invalid_preconditions?: boolean;
  canonical_invalid_preconditions?: boolean;
  created_at?: string;
}): LionMismatchEvent | null {
  const statusMismatch = args.legacy_status !== args.canonical_status;
  const overstatement = isLionStatusOverstatement(args);
  const invalidPreconditionsMismatch =
    args.legacy_invalid_preconditions !== args.canonical_invalid_preconditions;
  const canonicalNotSustainableMismatch =
    args.canonical_status === "NOT_SUSTAINABLE" &&
    args.legacy_status !== "NOT_SUSTAINABLE";

  if (!statusMismatch && !invalidPreconditionsMismatch) {
    return null;
  }

  const counters = getMutableLionMismatchCounters();
  counters.lion_mismatch_total += 1;

  if (overstatement) {
    counters.lion_mismatch_overstatement_total += 1;
  }

  if (invalidPreconditionsMismatch) {
    counters.lion_invalid_preconditions_mismatch_total += 1;
  }

  const severity =
    overstatement || invalidPreconditionsMismatch || canonicalNotSustainableMismatch
      ? "CRITICAL"
      : classifyLionMismatchSeverity(args.canonical_status, args.legacy_status);

  const event: LionMismatchEvent = {
    model_keys_used: [...args.model_keys_used].sort(),
    canonical_status: args.canonical_status,
    legacy_status: args.legacy_status,
    severity,
    canonical_signals: args.canonical_signals,
    legacy_summary: args.legacy_summary,
    reasons: [...(args.reasons ?? [])].sort(),
    input_signature: args.input_signature,
    created_at: args.created_at ?? new Date().toISOString(),
  };

  // Unsampled status/overstatement/precondition audit log.
  console.warn("[lion:mismatch]", {
    type: "lion_mismatch",
    severity: event.severity,
    legacy_status: event.legacy_status,
    canonical_status: event.canonical_status,
    agreement_level: args.agreement_level,
    reason: event.reasons,
    input_hash: event.input_signature,
    timestamp: event.created_at,
    overstatement,
    invalid_preconditions_mismatch: invalidPreconditionsMismatch,
    counters: getLionMismatchCounters(),
  });

  if (severity === "CRITICAL" || shouldLogLionMismatch(severity, event.input_signature)) {
    console.warn("[lion:mismatch_detail_sampled]", event);
  }

  return event;
}
