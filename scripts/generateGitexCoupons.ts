/**
 * Bulk-insert GITEX Asia 2026 coupons (service role required).
 *
 * Usage (repo root):
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx scripts/generateGitexCoupons.ts
 *
 * Generates 220 × type 15 (7-day) and 170 × type 25 (14-day), writes CSV to docs/samples/gitex-coupons.csv
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const COUNT_15 = 220;
const COUNT_25 = 170;

function randomSegment(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const len = 4 + Math.floor(Math.random() * 3);
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return s;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seen = new Set<string>();
  const rows: { code: string; type: "15" | "25"; duration_days: number }[] = [];

  function pushBatch(type: "15" | "25", count: number, durationDays: number) {
    for (let i = 0; i < count; i++) {
      let code = "";
      for (let attempt = 0; attempt < 500; attempt++) {
        const c = `CB-GITEX-${type}-${randomSegment()}`;
        if (!seen.has(c)) {
          seen.add(c);
          code = c;
          break;
        }
      }
      if (!code) throw new Error("Could not generate unique code");
      rows.push({ code, type, duration_days: durationDays });
    }
  }

  pushBatch("15", COUNT_15, 7);
  pushBatch("25", COUNT_25, 14);

  const insertPayload = rows.map((r) => ({
    code: r.code,
    type: r.type,
    duration_days: r.duration_days,
    expiry_date: "2026-04-30",
    campaign_tag: "GITEX2026",
  }));

  const { error } = await supabase.schema("public").from("gitex_coupons").insert(insertPayload);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(scriptDir, "..");
  const outDir = join(repoRoot, "docs", "samples");
  mkdirSync(outDir, { recursive: true });
  const csvPath = join(outDir, "gitex-coupons.csv");
  const csv = ["code,type", ...rows.map((r) => `${r.code},${r.type}`)].join("\n");
  writeFileSync(csvPath, csv, "utf8");

  console.log(`Inserted ${rows.length} coupons. CSV: ${csvPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
