import { Redis } from "@upstash/redis";

/**
 * Thin, optional Redis cache. If `UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN` aren't set, every operation is a no-op so the
 * app keeps working — the cache is a perf layer, never a source of truth.
 *
 * All public functions catch their own errors. Redis is a best-effort
 * accelerator: if it's slow or down, we fall back to the underlying source.
 */
let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    client = null;
    return null;
  }
  try {
    client = new Redis({ url, token });
  } catch (e) {
    console.error("[cache] failed to init Upstash client", e);
    client = null;
  }
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const v = await c.get<T>(key);
    return v ?? null;
  } catch (e) {
    console.error("[cache] get failed", key, e);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.error("[cache] set failed", key, e);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const c = getClient();
  if (!c || !keys.length) return;
  try {
    await c.del(...keys);
  } catch (e) {
    console.error("[cache] del failed", keys, e);
  }
}

/**
 * Cache-aside helper: returns cached value if present, otherwise calls
 * `loader` and writes the result back with `ttlSeconds`. The loader is
 * always awaited on a miss — never run speculatively.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const fresh = await loader();
  // Skip writing null/undefined/empty arrays so we don't pin a bad result
  // when the upstream temporarily 404s.
  if (fresh !== null && fresh !== undefined) {
    await cacheSet(key, fresh, ttlSeconds);
  }
  return fresh;
}

export const cacheKeys = {
  trendingTags: "trending:tags:v1",
  suggestions: (userId: string) => `suggestions:v1:${userId}`,
  userByName: (username: string) => `user:byname:v1:${username.toLowerCase()}`,
};
