import { describe, expect, it } from "vitest";
import { frameworkModuleAvailabilityFromPlanSlug } from "../src/platformAccess";

describe("frameworkModuleAvailabilityFromPlanSlug", () => {
  it("anonymous: all modules show available", () => {
    const r = frameworkModuleAvailabilityFromPlanSlug({ signedIn: false, planSlug: null });
    expect(r).toEqual({ module3Unavailable: false, module4Unavailable: false });
  });

  it("trial signed-in: M3 and M4 unavailable", () => {
    const r = frameworkModuleAvailabilityFromPlanSlug({ signedIn: true, planSlug: "trial" });
    expect(r).toEqual({ module3Unavailable: true, module4Unavailable: true });
  });

  it("monthly signed-in: M4 only unavailable", () => {
    const r = frameworkModuleAvailabilityFromPlanSlug({ signedIn: true, planSlug: "monthly" });
    expect(r).toEqual({ module3Unavailable: false, module4Unavailable: true });
  });

  it("strategic signed-in: M3 and M4 available", () => {
    const r = frameworkModuleAvailabilityFromPlanSlug({ signedIn: true, planSlug: "strategic" });
    expect(r).toEqual({ module3Unavailable: false, module4Unavailable: false });
  });
});
