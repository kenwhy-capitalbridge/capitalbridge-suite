import { redirect } from "next/navigation";
import { PlatformFrameworkHeader } from "@/app/components/PlatformFrameworkHeader";
import { StrategicExecutionClient } from "@/app/solutions/strategic-execution/StrategicExecutionClient";
import { getServerUserAndMembership } from "@/lib/auth";

export default async function StrategicExecutionContainer() {
  const { user, membership } = await getServerUserAndMembership();
  if (!user) redirect("/");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0D3A1D" }}>
      <PlatformFrameworkHeader
        verifiedUserEmail={user.email}
        profileNames={{ firstName: user.firstName ?? null, lastName: user.lastName ?? null }}
        membershipPlanSlug={membership?.plan ?? null}
        centerTitle="STRATEGIC EXECUTION"
        showBackBeforeHome
        backFallbackHref="/framework"
      />
      <StrategicExecutionClient />
    </div>
  );
}
