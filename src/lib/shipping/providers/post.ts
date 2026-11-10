import type { QuoteInput, QuoteResult } from "../types";

/**
 * محاسبه تقریبی پست پیشتاز بر اساس تعرفه عمومی (وزن + نوع مسیر)
 * API رسمی عمومی ساده ندارد؛ این جدول تا اتصال تاپین/قرارداد قابل استفاده است.
 * مبالغ به تومان — تقریبی ۱۴۰۵
 */
function zoneFee(weightGrams: number, zone: "inside" | "adjacent" | "other"): number {
  const w = Math.max(1, weightGrams);
  // پایه تا ۱ کیلو
  const base =
    zone === "inside" ? 80000 : zone === "adjacent" ? 90000 : 100000;
  if (w <= 1000) return base;
  const extraKg = Math.ceil((w - 1000) / 1000);
  const perKg =
    zone === "inside" ? 12500 : zone === "adjacent" ? 15500 : 17500;
  return base + extraKg * perKg;
}

function detectZone(destProvince?: string): "inside" | "adjacent" | "other" {
  const p = (destProvince || "").trim();
  // فرض: انبار فروشگاه تهران است — در فاز کامل از تنظیمات خوانده می‌شود
  if (!p || /تهران|البرز/.test(p)) return "inside";
  if (/قم|مرکزی|قزوین|مازندران|سمنان|گیلان/.test(p)) return "adjacent";
  return "other";
}

export async function postPishtazQuote(input: QuoteInput): Promise<QuoteResult> {
  const zone = detectZone(input.destProvince);
  const fee = zoneFee(input.weightGrams || 500, zone);
  return {
    ok: true,
    fee,
    currency: "IRR",
    source: "table",
    note: "تعرفه تقریبی پست پیشتاز — برای نرخ دقیق قرارداد/تاپین لازم است",
  };
}
