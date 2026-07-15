import { InMemoryRateLimiter } from "./in-memory";
import { UpstashRateLimiter } from "./upstash";
import type { RateLimiter, RateLimitResult } from "./types";

export type { RateLimiter, RateLimitResult };
export { InMemoryRateLimiter };
export { UpstashRateLimiter, RateLimiterUnavailableError } from "./upstash";

let cachedLimiter: RateLimiter | undefined;

/**
 * Selects the shared-store limiter when Upstash credentials are present,
 * otherwise falls back to the in-memory limiter — the same fallback
 * philosophy used for AI configuration (`services/ai/client.ts`): the app
 * always works, and upgrades itself automatically once real infrastructure
 * is connected, with no code changes required.
 */
export function getRateLimiter(): RateLimiter {
  if (cachedLimiter) return cachedLimiter;

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  cachedLimiter =
    restUrl && restToken ? new UpstashRateLimiter(restUrl, restToken) : new InMemoryRateLimiter();
  return cachedLimiter;
}

/**
 * Checks a rate limit using whichever limiter is configured, failing open
 * (allowing the request through) if a shared store is briefly unreachable.
 * A rate limiter outage should degrade availability, not take down the AI
 * routes it exists to protect.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    return await getRateLimiter().check(key, limit, windowMs);
  } catch (error) {
    console.error("Rate limiter unavailable, failing open", error);
    return { allowed: true, remaining: limit };
  }
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}
