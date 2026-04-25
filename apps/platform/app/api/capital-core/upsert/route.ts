import { NextResponse } from "next/server";
import { getAdvisoryRequestContext } from "@cb/advisory-graph/server/requestContext";

export const dynamic = "force-dynamic";

type SnapshotBody = {
  base_currency?: unknown;
  as_of?: unknown;
  notes?: unknown;
  assets?: unknown;
  liabilities?: unknown;
  income_streams?: unknown;
  obligations?: unknown;
};

type SnapshotRpcResult = {
  capital_graph_id: string;
  version: number;
  assets_count: number;
  liabilities_count: number;
  income_streams_count: number;
  obligations_count: number;
  updated_at: string;
};

type CapitalRecord = Record<string, unknown>;

function toObjectArray(value: unknown): CapitalRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is CapitalRecord => typeof v === "object" && v !== null && !Array.isArray(v));
}

function toCurrency(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(raw) ? raw : "MYR";
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAssetRows(rows: CapitalRecord[]): CapitalRecord[] {
  return rows.map((row) => ({
    entity_id: toOptionalString(row.entity_id),
    asset_type: toOptionalString(row.asset_type) ?? "other",
    label: toOptionalString(row.label) ?? "Unnamed asset",
    market_value: String(row.market_value ?? "0"),
    currency: toCurrency(row.currency),
    liquidity_days: Number.isFinite(Number(row.liquidity_days)) ? Number(row.liquidity_days) : 0,
    source: toOptionalString(row.source) ?? "user_manual",
    as_of: toIsoTimestamp(row.as_of),
  }));
}

function normalizeLiabilityRows(rows: CapitalRecord[]): CapitalRecord[] {
  return rows.map((row) => ({
    entity_id: toOptionalString(row.entity_id),
    liability_type: toOptionalString(row.liability_type) ?? "other",
    label: toOptionalString(row.label) ?? "Unnamed liability",
    outstanding_balance: String(row.outstanding_balance ?? "0"),
    minimum_monthly_payment: String(row.minimum_monthly_payment ?? "0"),
    currency: toCurrency(row.currency),
    source: toOptionalString(row.source) ?? "user_manual",
    as_of: toIsoTimestamp(row.as_of),
  }));
}

function normalizeIncomeRows(rows: CapitalRecord[]): CapitalRecord[] {
  return rows.map((row) => ({
    entity_id: toOptionalString(row.entity_id),
    income_type: toOptionalString(row.income_type) ?? "other",
    label: toOptionalString(row.label) ?? "Unnamed income stream",
    gross_amount_monthly: String(row.gross_amount_monthly ?? "0"),
    currency: toCurrency(row.currency),
    stability_score: Number.isFinite(Number(row.stability_score)) ? Number(row.stability_score) : 50,
    source: toOptionalString(row.source) ?? "user_manual",
    as_of: toIsoTimestamp(row.as_of),
  }));
}

function normalizeObligationRows(rows: CapitalRecord[]): CapitalRecord[] {
  return rows.map((row) => ({
    entity_id: toOptionalString(row.entity_id),
    obligation_type: toOptionalString(row.obligation_type) ?? "other",
    label: toOptionalString(row.label) ?? "Unnamed obligation",
    amount_monthly: String(row.amount_monthly ?? "0"),
    currency: toCurrency(row.currency),
    is_discretionary: Boolean(row.is_discretionary),
    source: toOptionalString(row.source) ?? "user_manual",
    as_of: toIsoTimestamp(row.as_of),
  }));
}

function buildPayload(body: SnapshotBody) {
  return {
    base_currency: toCurrency(body.base_currency),
    as_of: toIsoTimestamp(body.as_of),
    notes: toOptionalString(body.notes),
    assets: normalizeAssetRows(toObjectArray(body.assets)),
    liabilities: normalizeLiabilityRows(toObjectArray(body.liabilities)),
    income_streams: normalizeIncomeRows(toObjectArray(body.income_streams)),
    obligations: normalizeObligationRows(toObjectArray(body.obligations)),
  };
}

function isRpcNotFound(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();
  return code === "PGRST202" || msg.includes("function") && msg.includes("not found");
}

export async function POST(request: Request) {
  try {
    const { user, db } = await getAdvisoryRequestContext();
    const body = (await request.json().catch(() => ({}))) as SnapshotBody;
    const payload = buildPayload(body);

    const client = db as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{
        data: SnapshotRpcResult[] | SnapshotRpcResult | null;
        error: { code?: string; message?: string } | null;
      }>;
      schema: (name: string) => {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: SnapshotRpcResult[] | SnapshotRpcResult | null;
          error: { code?: string; message?: string } | null;
        }>;
      };
    };

    let rpcResult = await client.schema("advisory_v2").rpc("upsert_capital_graph_snapshot", {
      p_user_id: user.id,
      p_payload: payload,
    });
    if (rpcResult.error && isRpcNotFound(rpcResult.error)) {
      rpcResult = await client.rpc("upsert_capital_graph_snapshot", {
        p_user_id: user.id,
        p_payload: payload,
      });
    }

    if (rpcResult.error) {
      console.error("[capital-core upsert] rpc failed", rpcResult.error.message);
      return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
    }

    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    if (!row?.capital_graph_id) {
      return NextResponse.json({ error: "upsert_no_result" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      capital_graph_id: row.capital_graph_id,
      version: row.version,
      counts: {
        assets: row.assets_count,
        liabilities: row.liabilities_count,
        income_streams: row.income_streams_count,
        obligations: row.obligations_count,
      },
      updated_at: row.updated_at,
    });
  } catch (error) {
    console.error("[capital-core upsert] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
