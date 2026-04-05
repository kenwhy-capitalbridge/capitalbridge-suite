import { ForeverDashboardClient } from "./ForeverDashboardClient";
import { requireForeverDashboardAuth } from "./foreverDashboardGate";

export const dynamic = "force-dynamic";

export default async function ForeverDashboard() {
  const { reportClientDisplayName, modelCurrencyPrefix, lionAccessUser } =
    await requireForeverDashboardAuth();

  return (
    <main className="min-h-0">
      <ForeverDashboardClient
        lionAccessUser={lionAccessUser}
        reportClientDisplayName={reportClientDisplayName}
        modelCurrencyPrefix={modelCurrencyPrefix}
      />
    </main>
  );
}
