import { redirect } from "next/navigation";
import { getServerUserAndMembership } from "@/lib/auth";
import { PaymentGate } from "./components/PaymentGate";
import { PersonaHeader } from "./dashboard/components/PersonaHeader";
import { DashboardTiles } from "./dashboard/components/DashboardTiles";

export const dynamic = "force-dynamic";

const useV2 = process.env.NEXT_PUBLIC_USE_V2 === "1";

export default async function Page({
  searchParams,
}: {
  searchParams?: { plan?: string };
}) {
  const { user, membership } = await getServerUserAndMembership();
  if (!user) redirect("/login");

  const now = new Date();
  const isActive =
    !!membership &&
    membership.start_date !== null &&
    (membership.end_date === null || new Date(membership.end_date) > now);

  if (!isActive) {
    return <PaymentGate userId={user.id} plan={searchParams?.plan ?? null} />;
  }

  const displayName = user.name ?? user.email ?? "there";

  return (
    <main>
      {/* Prominent welcome at the very top */}
      <div
        style={{
          width: "100%",
          padding: "0.75rem 1.25rem",
          backgroundColor: "rgba(255,204,106,0.12)",
          borderBottom: "1px solid rgba(255,204,106,0.3)",
          textAlign: "center",
        }}
      >
        {useV2 ? (
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
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "rgba(246,245,241,0.98)",
              letterSpacing: "0.02em",
            }}
          >
            Welcome, {displayName}.
          </p>
        )}
        {!useV2 && (
          <p style={{ fontSize: "0.8rem", color: "rgba(246,245,241,0.75)", margin: "0.35rem 0 0" }}>
            Signed in as {user.email ?? "client"}
          </p>
        )}
      </div>

      <section style={{ padding: "1rem 0 2rem" }}>
        <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 1rem" }}>
          {useV2 ? (
            <DashboardTiles />
          ) : (
            <div
              style={{
                width: "100%",
                minHeight: "80vh",
                border: "1px solid rgba(255,204,106,0.35)",
                borderRadius: 12,
                backgroundColor: "#0D3A1D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(246,245,241,0.9)",
                fontSize: "1rem",
              }}
            >
              Advisory tools content
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
