import { redirect } from "next/navigation";

/**
 * Legacy v6 print URL — report PDF is generated via SAVE REPORT → `/dashboard/report-document/[exportId]`.
 */
export default function LegacyForeverPrintRedirect() {
  redirect("/dashboard");
}
