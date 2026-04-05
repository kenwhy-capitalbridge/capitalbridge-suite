/**
 * STEP 6 — persist one `report_exports` row per print capture session (exportId + report_id + tier).
 */

import { createAppServerClient } from "@cb/supabase/server";

export async function insertForeverReportExportRow(
  supabase: Awaited<ReturnType<typeof createAppServerClient>>,
  args: { userId: string; reportId: string; tier: string },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("report_exports")
    .insert({
      user_id: args.userId,
      report_id: args.reportId,
      tier: args.tier.length > 0 ? args.tier : null,
      lion_config: {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[forever print] report_exports insert failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}
