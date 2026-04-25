import { NextResponse } from "next/server";
import { getAdvisoryRequestContext } from "@cb/advisory-graph/server/requestContext";

export const dynamic = "force-dynamic";

type Body = {
  capital_graph_id?: unknown;
  capital_graph_version?: unknown;
};

type SnapshotRpcResult = {
  snapshot_id: string;
  capital_graph_id: string;
  capital_graph_version: number;
  total_assets: string | number;
  total_liabilities: string | number;
  net_worth: string | number;
  monthly_income_total: string | number;
  monthly_obligations_total: string | number;
  monthly_surplus: string | number;
  liquidity_buffer_months: string | number;
  computed_from_record_count: number;
  computed_from: Record<string, unknown>;
  created_at: string;
};

function toUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return null;
  }
  return v;
}

function toVersion(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

type RpcError = { code?: string; message?: string } | null;

function classifyRpcError(error: RpcError): { error: string; status: number } {
  if (!error) return { error: "internal_error", status: 500 };
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();

  if (code === "PGRST202" || (msg.includes("function") && msg.includes("not found"))) {
    return { error: "snapshot_function_not_available", status: 503 };
  }
  if (msg.includes("capital_graph_not_found")) {
    return { error: "not_authorized", status: 403 };
  }
  if (msg.includes("capital_graph_version_mismatch")) {
    return { error: "version_mismatch", status: 409 };
  }
  if (msg.includes("snapshot_validation_mismatch_existing") || msg.includes("snapshot_null_aggregation")) {
    return { error: "validation_failed", status: 422 };
  }
  if (msg.includes("snapshot_invariant_")) {
    return { error: "validation_failed", status: 422 };
  }
  if (msg.includes("snapshot_conflict_no_existing")) {
    return { error: "concurrency_conflict", status: 409 };
  }
  if (msg.includes("required")) {
    return { error: "validation_failed", status: 400 };
  }
  return { error: "internal_error", status: 500 };
}

export async function POST(request: Request) {
  try {
    const { user, db } = await getAdvisoryRequestContext();
    const body = (await request.json().catch(() => ({}))) as Body;
    const capitalGraphId = toUuid(body.capital_graph_id);
    const capitalGraphVersion = toVersion(body.capital_graph_version);

    if (!capitalGraphId || !capitalGraphVersion) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

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

    const rpcResult = await client.schema("advisory_v2").rpc("generate_capital_snapshot", {
      p_user_id: user.id,
      p_capital_graph_id: capitalGraphId,
      p_capital_graph_version: capitalGraphVersion,
    });

    if (rpcResult.error) {
      console.error("[capital-core snapshot/generate] rpc failed", rpcResult.error.message);
      const classified = classifyRpcError(rpcResult.error);
      return NextResponse.json({ error: classified.error }, { status: classified.status });
    }

    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    if (!row?.snapshot_id) {
      return NextResponse.json({ error: "snapshot_no_result" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      snapshot: row,
    });
  } catch (error) {
    console.error("[capital-core snapshot/generate] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
