import type { RateLimiter, RateLimitResult } from "./types";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiter held in process memory. Correct for a single
 * running instance; does not coordinate across multiple instances, so
 * limits can be bypassed by hitting different serverless instances. Used
 * automatically whenever no shared store is configured — see
 * `UpstashRateLimiter` and `getRateLimiter()` in `./index.ts`.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1 };
    }

    if (bucket.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    bucket.count += 1;
    return { allowed: true, remaining: limit - bucket.count };
  }
}
