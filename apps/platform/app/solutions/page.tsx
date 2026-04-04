import { redirect } from "next/navigation";
import { solutionsFamilyOfficeCopyForAdvisoryMarket } from "@cb/shared/markets";
import { PlatformFrameworkHeader } from "../components/PlatformFrameworkHeader";
import { getServerUserAndMembership } from "@/lib/auth";
import { PriorityAccessClient } from "./PriorityAccessClient";

export const dynamic = "force-dynamic";

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ report_id?: string }>;
}) {
  const { user, membership } = await getServerUserAndMembership();
  if (!user) redirect("/");

  const sp = searchParams ? await searchParams : undefined;
  const reportId = sp?.report_id ?? null;
  const fullName =
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    "Capital Bridge User";
  const isStrategicPlan = membership?.plan === "strategic";

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
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding:
            "clamp(1rem, 2.5vw, 2.25rem) clamp(0.75rem, 2vw, 1.25rem) clamp(2rem, 4vw, 3rem)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <section
            style={{
              padding: "2rem",
              borderRadius: 24,
              background:
                "linear-gradient(180deg, rgba(255,204,106,0.08) 0%, rgba(13,58,29,0.08) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p style={eyebrowStyle}>Strategic access</p>
            <h1 style={{ margin: "0.3rem 0 0", fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.04 }}>
              Strategic Execution (Coming Soon)
            </h1>
            <div style={{ marginTop: "1.25rem", maxWidth: 720 }}>
              <p style={{ ...bodyStyle, margin: 0, fontWeight: 700, fontSize: "1.05rem" }}>
                This is where capital starts working for you, not just sitting.
              </p>
              <p style={{ ...bodyStyle, margin: "0.85rem 0 0" }}>
                This layer connects your capital structure to real financing, investment opportunities, and structured
                income distribution through Capital Bridge™ partners.
              </p>
              <p style={{ ...bodyStyle, margin: "0.85rem 0 0" }}>
                {isStrategicPlan
                  ? "Access is available under Strategic Advisory."
                  : solutionsFamilyOfficeCopyForAdvisoryMarket(user.advisory_market ?? null)}
              </p>
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <PriorityAccessClient
                fullName={fullName}
                email={user.email ?? ""}
                reportId={reportId}
                isStrategicPlan={isStrategicPlan}
              />
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginTop: "1.5rem",
            }}
          >
            <InfoCard
              title="What happens now"
              body="Interest is captured immediately, and follow-up stays controlled and manual while the partner network is being onboarded."
            />
            <InfoCard
              title="Why this is safe"
              body="There is no promise of execution today. The flow simply preserves high-intent demand without creating operational pressure."
            />
            <InfoCard
              title="Who this is for"
              body="Users who want priority access to structured execution in financing, insurance, or income structuring when it goes live."
            />
          </section>

        </div>
      </main>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: "1.15rem 1.2rem",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.05rem", lineHeight: 1.2 }}>{title}</h2>
      <p style={{ ...bodyStyle, margin: "0.55rem 0 0" }}>{body}</p>
    </div>
  );
}

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.75rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(246,245,241,0.72)",
  fontWeight: 700,
};

const bodyStyle: React.CSSProperties = {
  fontSize: "1rem",
  lineHeight: 1.7,
  color: "rgba(246,245,241,0.9)",
};
