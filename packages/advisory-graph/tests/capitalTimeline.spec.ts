import { describe, expect, it } from "vitest";
import {
  buildCapitalTimelinePrintPayload,
  capitalTrajectoryFromYValues,
  latestChangePlainEnglish,
} from "../src/reports/capitalTimeline";

describe("capitalTrajectoryFromYValues", () => {
  it("returns stable inside dead band", () => {
    expect(capitalTrajectoryFromYValues([50, 52])).toBe("stable");
  });
  it("returns improving when last is meaningfully higher", () => {
    expect(capitalTrajectoryFromYValues([50, 60])).toBe("improving");
  });
  it("returns deteriorating when last is meaningfully lower", () => {
    expect(capitalTrajectoryFromYValues([60, 50])).toBe("deteriorating");
  });
});

describe("latestChangePlainEnglish", () => {
  it("describes an increase", () => {
    const s = latestChangePlainEnglish(55,62);
    expect(s).toContain("55");
    expect(s).toContain("62");
    expect(s.toLowerCase()).toContain("rose");
  });
});

describe("buildCapitalTimelinePrintPayload", () => {
  it("returns null without prior saved points", () => {
    expect(
      buildCapitalTimelinePrintPayload([], 70, 1_700_000_000_000),
    ).toBeNull();
  });
  it("builds payload with one prior report and current", () => {
    const historical: Parameters<typeof buildCapitalTimelinePrintPayload>[0] = [
      { t: 1, y: 50, source: "saved" },
    ];
    const p = buildCapitalTimelinePrintPayload(historical, 62, 2);
    expect(p).not.toBeNull();
    expect(p!.points).toHaveLength(2);
    expect(p!.trajectory).toBe("improving");
    expect(p!.latestChangePlain).toContain("50");
    expect(p!.latestChangePlain).toContain("62");
  });
});
