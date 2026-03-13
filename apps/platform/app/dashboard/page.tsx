import { redirect } from "next/navigation";
import { getServerUserAndMembership } from "@/lib/auth";
import { PaymentGate } from "../components/PaymentGate";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
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

  return (
    <main>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "1rem 1.25rem 0.5rem",
          borderBottom: "1px solid rgba(255,204,106,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          backgroundColor: "#0D3A1D",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,204,106,0.85)",
              margin: 0,
            }}
          >
            Capital Bridge Advisory Platform
          </p>
          <p style={{ fontSize: "0.8rem", color: "rgba(246,245,241,0.8)", margin: "0.25rem 0 0" }}>
            Signed in as {user.email ?? "client"}
          </p>
        </div>
      </header>

      <section style={{ padding: "1rem 0 2rem" }}>
        <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 1rem" }}>
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
        </div>
      </section>
    </main>
  );
}

