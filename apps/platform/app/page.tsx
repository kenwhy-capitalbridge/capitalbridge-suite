import { getServerUserAndMembership } from "@/lib/auth";
import { PaymentGate } from "./components/PaymentGate";
import { PersonaHeader } from "./dashboard/components/PersonaHeader";
import { DashboardTiles } from "./dashboard/components/DashboardTiles";
import { FrameworkStaticLanding } from "./components/FrameworkStaticLanding";
import { PlatformFrameworkHeader } from "./components/PlatformFrameworkHeader";

export const dynamic = "force-dynamic";

const useV2 = process.env.NEXT_PUBLIC_USE_V2 === "1";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const { user, membership } = await getServerUserAndMembership();
  if (!user) return <FrameworkStaticLanding />;

  const sp = searchParams ? await searchParams : undefined;

  const now = new Date();
  const isActive =
    !!membership &&
    membership.start_date !== null &&
    (membership.end_date === null || new Date(membership.end_date) > now);

  if (!isActive) {
    return (
      <>
        <PlatformFrameworkHeader
          verifiedUserEmail={user.email}
          profileNames={{ firstName: user.firstName ?? null, lastName: user.lastName ?? null }}
        />
        <PaymentGate userId={user.id} plan={sp?.plan ?? null} />
      </>
    );
  }

  if (!useV2) {
    return <FrameworkStaticLanding userEmail={user.email} />;
  }

  return (
    <>
      <PlatformFrameworkHeader
        verifiedUserEmail={user.email}
        profileNames={{ firstName: user.firstName ?? null, lastName: user.lastName ?? null }}
      />
      <main>
        <div
          style={{
            width: "100%",
            padding: "0.75rem 1.25rem",
            backgroundColor: "rgba(255,204,106,0.12)",
            borderBottom: "1px solid rgba(255,204,106,0.3)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.35rem",
              textAlign: "center",
            }}
          >
            <PersonaHeader />
          </div>
        </div>

        <section style={{ padding: "1rem 0 2rem" }}>
          <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 1rem" }}>
            <DashboardTiles />
          </div>
        </section>
      </main>
    </>
  );
}
