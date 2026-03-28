import { notFound } from "next/navigation";
import { CapitalHealthDashboardClient } from "../dashboard/CapitalHealthDashboardClient";

/**
 * Local UI preview only — no Supabase / membership. Disabled in production.
 * Open http://localhost:3004/preview when `npm run dev -w @cb/capitalhealth`.
 */
export default function CapitalHealthLocalPreview() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <CapitalHealthDashboardClient
      canSeeVerdict
      lionAccessUser={{ isPaid: true, hasActiveTrialUpgrade: false }}
      reportClientDisplayName="Preview user"
    />
  );
}
