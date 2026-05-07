// Lightweight in-memory rate limiter. One bucket per (key, prefix).
// Replaces nothing; if you wire Upstash later, swap this module's
// implementation but keep the same `limit()` signature.
//
// On Vercel each serverless invocation may get a fresh module — so this
// is best-effort, not a hard cap. For real protection, configure Upstash.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function limit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return { ok: true, remaining: max - 1, resetAt: next.resetAt };
  }
  if (existing.count >= max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { ok: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    { error: "Too many requests. Slow down a moment." },
    {
      status: 429,
      headers: {
        "Retry-After": Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)).toString(),
      },
    },
  );
}
