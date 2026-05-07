import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformFrameworkHeader } from "@/app/components/PlatformFrameworkHeader";
import { AdvisoryModuleFlowNavClient } from "@/components/advisory-dashboard";
import { fontSerif } from "@/components/advisory-dashboard/cbDashboardTokens";
import { getServerUserAndMembership } from "@/lib/auth";
import { isStagingCapitalBridgeHost, normalizeRequestHost } from "@cb/shared/staging";
import type { ModelKey } from "@/components/advisory-dashboard/lionVerdictTypes";

type ModuleId = "forever-income" | "income-engineering" | "capital-health" | "capital-stress";

const MODULE_FLOW_KEY: Record<ModuleId, ModelKey> = {
  "forever-income": "forever-income-model",
  "income-engineering": "income-engineering-model",
  "capital-health": "capital-health-model",
  "capital-stress": "capital-stress-model",
};

const MODULE_COPY: Record<ModuleId, { title: string; subtitle: string; envVar?: string; productionUrl: string }> = {
  "forever-income": {
    title: "Forever Income",
    subtitle: "Validate whether long-term income can remain sustainable without eroding capital.",
    envVar: "NEXT_PUBLIC_FOREVER_APP_URL",
    productionUrl: "https://forever.thecapitalbridge.com/dashboard",
  },
  "income-engineering": {
    title: "Income Engineering",
    subtitle: "Engineer a capital structure that supports your desired income target.",
    envVar: "NEXT_PUBLIC_INCOME_ENGINEERING_APP_URL",
    productionUrl: "https://incomeengineering.thecapitalbridge.com/dashboard",
  },
  "capital-health": {
    title: "Capital Health",
    subtitle: "Assess whether the capital structure is strong enough for long-term execution.",
    envVar: "NEXT_PUBLIC_CAPITAL_HEALTH_APP_URL",
    productionUrl: "https://capitalhealth.thecapitalbridge.com/dashboard",
  },
  "capital-stress": {
    title: "Capital Stress",
    subtitle: "Stress-test your capital structure under volatility, shocks, and uncertainty.",
    envVar: "NEXT_PUBLIC_CAPITAL_STRESS_APP_URL",
    productionUrl: "https://capitalstress.thecapitalbridge.com/dashboard",
  },
};

function resolveDestination(moduleId: ModuleId, stagingHost: boolean): string | null {
  const cfg = MODULE_COPY[moduleId];
  const envUrl = cfg.envVar ? process.env[cfg.envVar]?.trim() : undefined;
  if (envUrl) return envUrl;
  if (stagingHost) return null;
  return cfg.productionUrl;
}

export async function ModuleDashboardBridge({ moduleId }: { moduleId: ModuleId }) {
  const { user, membership } = await getServerUserAndMembership();
  if (!user) redirect("/");
  const host = normalizeRequestHost((await headers()).get("host"));
  const destination = resolveDestination(moduleId, isStagingCapitalBridgeHost(host));
  const copy = MODULE_COPY[moduleId];

  return (
    <div style={{ minHeight: "100vh", background: "#0D3A1D", color: "#F6F5F1" }}>
      <PlatformFrameworkHeader
        verifiedUserEmail={user.email}
        profileNames={{ firstName: user.firstName ?? null, lastName: user.lastName ?? null }}
        membershipPlanSlug={membership?.plan ?? null}
        centerTitle={copy.title.toUpperCase()}
        showBackBeforeHome
        backFallbackHref="/solutions/strategic-execution"
      />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 18px 40px" }}>
        <AdvisoryModuleFlowNavClient activeStepKey={MODULE_FLOW_KEY[moduleId]} />
        <section
          style={{
            marginTop: 18,
            border: "1px solid rgba(255,204,106,0.35)",
            borderRadius: 14,
            padding: 18,
            background: "rgba(8,42,24,0.72)",
          }}
        >
          <p style={{ margin: 0, color: "#FFCC6A", letterSpacing: "0.18em", fontSize: 11, fontWeight: 700 }}>ADVISORY MODULE</p>
          <h1 style={{ margin: "6px 0", fontFamily: fontSerif, fontSize: "clamp(34px, 5vw, 52px)" }}>{copy.title}</h1>
          <p style={{ margin: 0, maxWidth: 760 }}>{copy.subtitle}</p>
          <p style={{ margin: "10px 0 0", color: "rgba(246,245,241,0.9)" }}>
            {destination
              ? "This module runs in its dedicated advisory engine and opens in the configured environment."
              : "Staging destination pending. Configure the module URL env var to enable routing in staging."}
          </p>
          <div style={{ marginTop: 14 }}>
            {destination ? (
              <a href={destination} style={{ color: "#FFCC6A", border: "1px solid rgba(255,204,106,0.65)", padding: "8px 12px", borderRadius: 8, textDecoration: "none" }}>
                Open Module Dashboard
              </a>
            ) : (
              <span style={{ color: "#FFCC6A", border: "1px solid rgba(255,204,106,0.35)", padding: "8px 12px", borderRadius: 8, opacity: 0.7 }}>
                Staging destination pending
              </span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
