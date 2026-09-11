import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

afterEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit("ip:slug", { limit: 10 }).allowed).toBe(true);
    }
    expect(rateLimit("ip:slug", { limit: 10 }).allowed).toBe(false);
  });

  it("counts each key independently", () => {
    for (let i = 0; i < 10; i++) rateLimit("ip-a", { limit: 10 });
    expect(rateLimit("ip-a", { limit: 10 }).allowed).toBe(false);
    expect(rateLimit("ip-b", { limit: 10 }).allowed).toBe(true);
  });

  it("reports remaining budget", () => {
    expect(rateLimit("k", { limit: 3 }).remaining).toBe(2);
    expect(rateLimit("k", { limit: 3 }).remaining).toBe(1);
    expect(rateLimit("k", { limit: 3 }).remaining).toBe(0);
  });

  it("opens a fresh window once the old one expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 10; i++) rateLimit("k", { limit: 10, windowMs: 60_000 });
    expect(rateLimit("k", { limit: 10, windowMs: 60_000 }).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit("k", { limit: 10, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("returns a retry-after of at least one second", () => {
    const result = rateLimit("k", { limit: 1, windowMs: 100 });
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
