/**
 * لایه Redis Cache با Upstash
 * Browser Cache → CDN → Redis (این فایل) → Database
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      redis = Redis.fromEnv();
      return redis;
    }
  } catch {
    /* ignore */
  }
  return null;
}


function isDynamicServerUsage(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const dig = "digest" in e ? String((e as { digest?: string }).digest || "") : "";
  if (dig === "DYNAMIC_SERVER_USAGE") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("Dynamic server usage") || msg.includes("couldn't be rendered statically");
}

export function isRedisCacheEnabled(): boolean {
  return Boolean(getRedis());
}

/**
 * خواندن از کش — اگر نبود null برمی‌گرداند
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const data = await r.get<T>(key);
    return data ?? null;
  } catch (e) {
    if (!isDynamicServerUsage(e)) console.error("[cacheGet]", key, e);
    return null;
  }
}

/**
 * نوشتن در کش با TTL (ثانیه)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 60
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    if (!isDynamicServerUsage(e)) console.error("[cacheSet]", key, e);
  }
}

/**
 * حذف یک کلید
 */
export async function cacheDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch (e) {
    if (!isDynamicServerUsage(e)) console.error("[cacheDel]", key, e);
  }
}

/**
 * حذف همه کلیدهایی که با prefix شروع می‌شوند
 */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    // Upstash از SCAN پشتیبانی می‌کند
    let cursor: number | string = 0;
    do {
      const result: [string | number, string[]] = await r.scan(cursor, { match: `${prefix}*`, count: 100 }) as any;
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== 0 && cursor !== "0");
  } catch (e) {
    if (!isDynamicServerUsage(e)) console.error("[cacheDelByPrefix]", prefix, e);
  }
}

/**
 * الگو: اول کش را بخوان، اگر نبود از fetcher بگیر و ذخیره کن
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();
  // فقط مقادیر معتبر را کش کن
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds);
  }
  return value;
}

/** پیشوندهای استاندارد */
export const CacheKeys = {
  productBySlug: (slug: string) => `pm:product:slug:${slug}`,
  productsList: (hash: string) => `pm:products:list:${hash}`,
  categoryRoots: () => `pm:category:roots`,
  categoryBySlug: (slug: string) => `pm:category:slug:${slug}`,
  featuredProducts: () => `pm:products:featured`,
  newestProducts: () => `pm:products:newest`,
} as const;

/** TTL پیشنهادی (ثانیه) */
export const CacheTTL = {
  product: 120,       // ۲ دقیقه
  productList: 60,    // ۱ دقیقه
  category: 300,      // ۵ دقیقه
  featured: 90,       // ۱.۵ دقیقه
} as const;
