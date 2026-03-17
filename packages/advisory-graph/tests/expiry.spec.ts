import { describe, it, expect } from "vitest";
import { computeExpiry } from "../src/plans/expiry";

describe("computeExpiry", () => {
  it("adds 7 days correctly", () => {
    const start = new Date("2025-01-01T00:00:00.000Z");
    const result = computeExpiry(start, 7);
    expect(result.toISOString()).toBe("2025-01-08T00:00:00.000Z");
  });

  it("adds 30 days correctly", () => {
    const start = new Date("2025-01-01T00:00:00.000Z");
    const result = computeExpiry(start, 30);
    expect(result.toISOString()).toBe("2025-01-31T00:00:00.000Z");
  });

  it("adds 90 days correctly", () => {
    const start = new Date("2025-01-01T00:00:00.000Z");
    const result = computeExpiry(start, 90);
    expect(result.toISOString()).toBe("2025-04-01T00:00:00.000Z");
  });

  it("adds 365 days correctly", () => {
    const start = new Date("2025-01-01T00:00:00.000Z");
    const result = computeExpiry(start, 365);
    expect(result.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("crosses month boundary correctly", () => {
    const start = new Date("2025-01-15T00:00:00.000Z");
    const result = computeExpiry(start, 20);
    expect(result.toISOString()).toBe("2025-02-04T00:00:00.000Z");
  });

  it("crosses year boundary correctly", () => {
    const start = new Date("2025-12-15T00:00:00.000Z");
    const result = computeExpiry(start, 20);
    expect(result.toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });

  it("returns same day for 0 days", () => {
    const start = new Date("2025-06-10T00:00:00.000Z");
    const result = computeExpiry(start, 0);
    expect(result.toISOString()).toBe("2025-06-10T00:00:00.000Z");
  });
});
