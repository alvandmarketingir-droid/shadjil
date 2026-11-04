/**
 * Rate Limiting — Upstash (توزیع‌شده) + fallback حافظه‌ای
 * وقتی UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN تنظیم باشند از Upstash استفاده می‌کند.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------- Upstash (توزیع‌شده) ----------
let redis: Redis | null = null;
let upstashReady = false;

try {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redis = Redis.fromEnv();
    upstashReady = true;
  }
} catch {
  upstashReady = false;
}

/** محدودیت عمومی API / contact — 10 درخواست در 60 ثانیه */
export const apiRatelimit = upstashReady && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: true,
      prefix: "pm:api",
    })
  : null;

/** محدودیت سخت‌تر برای auth / OTP / login — 5 درخواست در 60 ثانیه */
export const authRatelimit = upstashReady && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "pm:auth",
    })
  : null;

/** محدودیت contact — 5 درخواست در 5 دقیقه */
export const contactRatelimit = upstashReady && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "5 m"),
      analytics: true,
      prefix: "pm:contact",
    })
  : null;

/** محدودیت سبد — 30 افزودن در 60 ثانیه (ضد اسپم) */
export const cartRatelimit = upstashReady && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      analytics: true,
      prefix: "pm:cart",
    })
  : null;

// ---------- Fallback حافظه‌ای (وقتی Upstash نیست) ----------
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function memoryLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = store.get(opts.key);
  if (!b || b.resetAt <= now) {
    store.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (b.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  b.count += 1;
  return { ok: true };
}

/** پاکسازی گاه‌به‌گاه */
export function rateLimitCleanup() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }
}

/**
 * تابع اصلی — هم برای Server Actions و هم API routes
 * identifier معمولاً IP یا userId است
 */
export async function checkRateLimit(opts: {
  identifier: string;
  type?: "api" | "auth" | "contact" | "cart";
}): Promise<{ success: boolean; remaining?: number; retryAfterSec?: number }> {
  const type = opts.type ?? "api";
  const id = opts.identifier || "anonymous";

  // اولویت با Upstash
  let limiter = apiRatelimit;
  if (type === "auth") limiter = authRatelimit;
  if (type === "contact") limiter = contactRatelimit;
  if (type === "cart") limiter = cartRatelimit;

  if (limiter) {
    try {
      const { success, remaining, reset } = await limiter.limit(id);
      if (!success) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((reset - Date.now()) / 1000)
        );
        return { success: false, remaining: 0, retryAfterSec };
      }
      return { success: true, remaining };
    } catch (e) {
      console.error("[rate-limit] Upstash error, falling back to memory", e);
    }
  }

  // Fallback حافظه‌ای
  const limits = {
    api: { limit: 20, windowMs: 60_000 },
    auth: { limit: 5, windowMs: 60_000 },
    contact: { limit: 5, windowMs: 5 * 60_000 },
    cart: { limit: 30, windowMs: 60_000 },
  }[type];

  const result = memoryLimit({
    key: `${type}:${id}`,
    limit: limits.limit,
    windowMs: limits.windowMs,
  });

  if (!result.ok) {
    return { success: false, retryAfterSec: result.retryAfterSec };
  }
  return { success: true };
}

/** نسخه قدیمی برای سازگاری با کدهای قبلی */
export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  return memoryLimit(opts);
}

export function isUpstashConfigured(): boolean {
  return upstashReady;
}
