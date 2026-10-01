/**
 * Fixed-window in-memory rate limiter for auth endpoints.
 *
 * Scope note: this state lives in the Node process, so it is exact for a single
 * self-hosted container (the deployment target for this app). If you ever run
 * more than one instance behind a load balancer, swap the Map for a shared
 * store — Redis via `Upstash-Ratelimit`, or a `pg` advisory-lock table — or the
 * limit becomes per-instance and therefore weaker than intended.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bound memory: without this a flood of unique keys (spoofed IPs, random
// emails) grows the Map without limit.
const MAX_BUCKETS = 10_000;

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(limit - existing.count, 0);
  return {
    ok: existing.count <= limit,
    remaining,
    retryAfter: Math.ceil((existing.resetAt - now) / 1000),
  };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

/** Best-effort client IP from proxy headers, for rate-limit bucketing. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
