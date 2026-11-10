/** نام وضعیت محصول رایج فارسی/انگلیسی → hex */
export function resolveColorHex(
  nameOrHex: string | null | undefined,
  explicitHex?: string | null,
): string {
  const hex = (explicitHex || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return hex;
  const raw = (nameOrHex || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return raw;
  const key = raw.replace(/\s+/g, "").toLowerCase();
  const map: Record<string, string> = {
    سفید: "#FFFFFF",
    سفیدکرم: "#F5F0E6",
    مشکی: "#111111",
    سیاه: "#111111",
    آبی: "#5B8FA8",
    آبیرون: "#5B8FA8",
    آبیروشن: "#A8C5D4",
    آبیتیره: "#1E3A5F",
    سرمه‌ای: "#1B2A4A",
    سرمه: "#1B2A4A",
    خاکستری: "#9CA3AF",
    طوسی: "#6B7280",
    قرمز: "#C41E3A",
    سبز: "#2D6A4F",
    زرد: "#EAB308",
    بژ: "#D4C4A8",
    کرم: "#F5E6C8",
    قهوه‌ای: "#6B4423",
    قهوه: "#6B4423",
    نارنجی: "#EA580C",
    صورتی: "#EC4899",
    بنفش: "#7C3AED",
    طلایی: "#D4AF37",
    نقره‌ای: "#C0C0C0",
    white: "#FFFFFF",
    black: "#111111",
    blue: "#5B8FA8",
    red: "#C41E3A",
    green: "#2D6A4F",
    gray: "#9CA3AF",
    grey: "#9CA3AF",
    navy: "#1B2A4A",
    beige: "#D4C4A8",
  };
  return map[key] || map[raw] || "#E5E7EB";
}

