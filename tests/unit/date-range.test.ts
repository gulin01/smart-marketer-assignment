import { describe, expect, it } from "vitest";
import { parseDateRange } from "@/lib/date-range";

const parse = (query: string) => parseDateRange(new URLSearchParams(query));

describe("parseDateRange", () => {
  it("returns undefined when neither bound is given", () => {
    const result = parse("");
    expect(result).toEqual({ ok: true, range: undefined });
  });

  it("accepts plain dates", () => {
    const result = parse("from=2026-01-01&to=2026-01-31");
    if (!result.ok) throw new Error("expected success");
    expect(result.range?.from?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("extends a bare `to` date through the end of that day", () => {
    const result = parse("to=2026-01-31");
    if (!result.ok) throw new Error("expected success");
    // Otherwise a filter ending "2026-01-31" would silently exclude that whole day.
    expect(result.range?.to?.toISOString()).toBe("2026-01-31T23:59:59.999Z");
  });

  it("accepts full timestamps unchanged", () => {
    const result = parse("from=2026-01-01T09:30:00Z");
    if (!result.ok) throw new Error("expected success");
    expect(result.range?.from?.toISOString()).toBe("2026-01-01T09:30:00.000Z");
  });

  it("rejects malformed dates", () => {
    expect(parse("from=yesterday").ok).toBe(false);
    expect(parse("to=2026-13-45").ok).toBe(false);
  });
});
