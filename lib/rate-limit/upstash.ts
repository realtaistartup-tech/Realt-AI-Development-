import type { RateLimiter, RateLimitResult } from "./types";

export class RateLimiterUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimiterUnavailableError";
  }
}

type UpstashPipelineReply = Array<{ result: number } | { error: string }>;

/**
 * Fixed-window rate limiter backed by Upstash Redis's REST API, so it
 * coordinates correctly across multiple serverless instances — unlike
 * `InMemoryRateLimiter`. Uses a pipelined INCR + PEXPIRE-with-NX so the
 * window's expiry is established atomically on the first request of each
 * window, without a separate round trip or a race between concurrent
 * requests.
 */
export class UpstashRateLimiter implements RateLimiter {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string,
  ) {}

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const response = await fetch(`${this.restUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.restToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
      ]),
    });

    if (!response.ok) {
      throw new RateLimiterUnavailableError(
        `Upstash rate limiter request failed with status ${response.status}.`,
      );
    }

    const results = (await response.json()) as UpstashPipelineReply;
    const first = results[0];
    if (!first || !("result" in first)) {
      throw new RateLimiterUnavailableError("Upstash rate limiter returned an unexpected reply.");
    }

    const count = first.result;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
    };
  }
}
