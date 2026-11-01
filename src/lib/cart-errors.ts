/** پیام‌های فارسی خطای سبد/موجودی */
export function mapCartError(code?: string | null): string {
  const c = String(code || "").trim();
  if (!c) return "عملیات سبد ناموفق بود.";
  if (c.startsWith("insufficient_stock")) {
    const n = c.split(":")[1];
    if (n === "0" || n === "") return "این کالا ناموجود است.";
    if (n && /^\d+$/.test(n)) {
      return `موجودی کافی نیست (حداکثر ${Number(n).toLocaleString("fa-IR")} عدد).`;
    }
    return "موجودی کافی نیست.";
  }
  const map: Record<string, string> = {
    unavailable: "این کالا در دسترس نیست.",
    variant_required: "نوع کالا مشخص نیست.",
    missing_variant: "نوع کالا مشخص نیست.",
    no_cart: "سبد خرید یافت نشد.",
    server: "خطای سرور. دوباره تلاش کنید.",
    login_required: "برای این کار وارد حساب شوید.",
  };
  if (map[c]) return map[c];
  if (/[\u0600-\u06FF]/.test(c)) return c;
  return "عملیات سبد ناموفق بود.";
}
