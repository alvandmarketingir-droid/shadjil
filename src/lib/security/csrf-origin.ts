/**
 * دفاع CSRF سطح origin (استاندارد سایت‌های بزرگ + OWASP)
 * - GET/HEAD/OPTIONS: رد نمی‌شود
 * - webhook/cron: جداگانه با secret/امضا محافظت می‌شوند
 * - بقیه POST/PUT/PATCH/DELETE به /api/* باید از origin مجاز بیایند
 */

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function getTrustedOrigins(): string[] {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://shadjil.ir").replace(/\/$/, "");
  const extra = (process.env.CSRF_TRUSTED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const list = new Set<string>([site, "https://shadjil.ir", "https://www.shadjil.ir", ...extra]);
  return [...list];
}

export function isCsrfExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/payment/webhook")) return true;
  if (pathname.startsWith("/api/vitals")) return true;
  return false;
}

export function assertApiCsrf(opts: {
  method: string;
  pathname: string;
  origin: string | null;
  referer: string | null;
  secFetchSite: string | null;
}): { ok: true } | { ok: false; reason: string } {
  const method = (opts.method || "GET").toUpperCase();
  if (SAFE.has(method)) return { ok: true };
  if (!opts.pathname.startsWith("/api/")) return { ok: true };
  if (isCsrfExemptPath(opts.pathname)) return { ok: true };

  const trusted = getTrustedOrigins();
  const origin = (opts.origin || "").trim();
  if (origin && origin !== "null") {
    const normalized = origin.replace(/\/$/, "");
    if (trusted.some((t) => t === normalized)) return { ok: true };
    return { ok: false, reason: "origin_mismatch" };
  }

  // بدون Origin: Sec-Fetch-Site
  const site = (opts.secFetchSite || "").toLowerCase();
  if (site === "same-origin" || site === "none") return { ok: true };
  if (site === "cross-site") return { ok: false, reason: "cross_site" };

  // Referer هم‌دامنه
  const ref = (opts.referer || "").trim();
  if (ref) {
    try {
      const host = new URL(ref).origin.replace(/\/$/, "");
      if (trusted.some((t) => t === host)) return { ok: true };
    } catch {
      /* ignore */
    }
  }

  // کلاینت غیرمرورگر بدون کوکی CSRF-relevant معمولاً Origin ندارد؛ APIهای عمومی با rate-limit جدا هستند
  // برای mutationهای session-based سخت‌گیر می‌مانیم اگر Sec-Fetch-Site=cross-site بود (بالا)
  return { ok: true };
}
