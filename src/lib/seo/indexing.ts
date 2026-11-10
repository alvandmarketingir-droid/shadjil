/**
 * کنترل سراسری ایندکس گوگل / موتورهای جستجو
 *
 * پیش‌فرض: سایت noindex می‌ماند.
 * برای لانچ عمومی در Vercel ست کنید:
 *   NEXT_PUBLIC_ALLOW_INDEX=true
 * و robots.ts / sitemap خودکار باز می‌شوند.
 */
export function isSiteIndexable(): boolean {
  const v = (process.env.NEXT_PUBLIC_ALLOW_INDEX || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir"
).replace(/\/$/, "");
