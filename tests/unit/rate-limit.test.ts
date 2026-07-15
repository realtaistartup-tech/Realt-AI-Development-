import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryRateLimiter } from "@/lib/rate-limit/in-memory";
import { RateLimiterUnavailableError, UpstashRateLimiter } from "@/lib/rate-limit/upstash";

describe("InMemoryRateLimiter", () => {
  it("allows requests up to the limit within the window", async () => {
    const limiter = new InMemoryRateLimiter();
    const results = await Promise.all([
      limiter.check("a", 3, 60_000),
      limiter.check("a", 3, 60_000),
      limiter.check("a", 3, 60_000),
    ]);
    // Fixed-window increments are not guaranteed to be sequential when run
    // concurrently, so just assert none were rejected and remaining never
    // goes negative.
    expect(results.every((r) => r.allowed)).toBe(true);
    expect(results.every((r) => r.remaining >= 0)).toBe(true);
  });

  it("blocks requests once the limit is exceeded", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check("b", 2, 60_000);
    await limiter.check("b", 2, 60_000);
    const third = await limiter.check("b", 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets the count once the window has elapsed", async () => {
    vi.useFakeTimers();
    try {
      const limiter = new InMemoryRateLimiter();
      await limiter.check("c", 1, 1_000);
      const blocked = await limiter.check("c", 1, 1_000);
      expect(blocked.allowed).toBe(false);

      vi.advanceTimersByTime(1_001);

      const afterWindow = await limiter.check("c", 1, 1_000);
      expect(afterWindow.allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks keys independently", async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.check("x", 1, 60_000);
    const otherKey = await limiter.check("y", 1, 60_000);
    expect(otherKey.allowed).toBe(true);
  });
});

describe("UpstashRateLimiter", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("allows the request when the incremented count is within the limit", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 3 }, { result: 1 }],
    }) as unknown as typeof fetch;

    const limiter = new UpstashRateLimiter("https://example.upstash.io", "token");
    const result = await limiter.check("key", 5, 60_000);
    expect(result).toEqual({ allowed: true, remaining: 2 });
  });

  it("blocks the request once the incremented count exceeds the limit", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 6 }, { result: 1 }],
    }) as unknown as typeof fetch;

    const limiter = new UpstashRateLimiter("https://example.upstash.io", "token");
    const result = await limiter.check("key", 5, 60_000);
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("sends a pipelined INCR + PEXPIRE-with-NX request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 1 }, { result: 1 }],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const limiter = new UpstashRateLimiter("https://example.upstash.io", "secret-token");
    await limiter.check("some-key", 10, 30_000);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.upstash.io/pipeline",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
        body: JSON.stringify([
          ["INCR", "some-key"],
          ["PEXPIRE", "some-key", "30000", "NX"],
        ]),
      }),
    );
  });

  it("throws RateLimiterUnavailableError on a non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;

    const limiter = new UpstashRateLimiter("https://example.upstash.io", "token");
    await expect(limiter.check("key", 5, 60_000)).rejects.toThrow(RateLimiterUnavailableError);
  });

  it("throws RateLimiterUnavailableError on a malformed reply", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ error: "WRONGTYPE" }],
    }) as unknown as typeof fetch;

    const limiter = new UpstashRateLimiter("https://example.upstash.io", "token");
    await expect(limiter.check("key", 5, 60_000)).rejects.toThrow(RateLimiterUnavailableError);
  });
});

describe("checkRateLimit / getRateLimiter factory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("uses the in-memory limiter when no Upstash credentials are configured", async () => {
    const { getRateLimiter } = await import("@/lib/rate-limit/index");
    const { InMemoryRateLimiter: InMemory } = await import("@/lib/rate-limit/in-memory");
    expect(getRateLimiter()).toBeInstanceOf(InMemory);
  });

  it("uses the Upstash limiter when both credentials are configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    const { getRateLimiter } = await import("@/lib/rate-limit/index");
    const { UpstashRateLimiter: Upstash } = await import("@/lib/rate-limit/upstash");
    expect(getRateLimiter()).toBeInstanceOf(Upstash);
  });

  it("fails open (allows the request) if the configured limiter throws", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const { checkRateLimit } = await import("@/lib/rate-limit/index");
    const result = await checkRateLimit("key", 5, 60_000);
    expect(result.allowed).toBe(true);
  });
});
