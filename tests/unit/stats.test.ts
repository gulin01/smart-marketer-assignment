import { describe, expect, it } from "vitest";
import { conversionRate } from "@/lib/stats";

describe("conversionRate", () => {
  it("is submissions divided by unique visitors", () => {
    expect(conversionRate(1, 2)).toBe(0.5);
    expect(conversionRate(3, 4)).toBe(0.75);
  });

  it("returns 0 rather than dividing by zero", () => {
    expect(conversionRate(0, 0)).toBe(0);
    // Submissions without a recorded visitor (e.g. cookies blocked) must not
    // produce Infinity and blow up the dashboard.
    expect(conversionRate(5, 0)).toBe(0);
  });

  it("rounds to four decimal places", () => {
    expect(conversionRate(1, 3)).toBe(0.3333);
    expect(conversionRate(2, 3)).toBe(0.6667);
  });

  it("can exceed 1 when one visitor submits repeatedly", () => {
    // Deliberate: we do not dedupe submissions (ADR 0008), so this is reachable
    // and should be reported honestly rather than clamped.
    expect(conversionRate(3, 2)).toBe(1.5);
  });
});
