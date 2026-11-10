/** منطق یکسان موجودی وضعیت محصول/مناسبت‌ها برای PDP، کارت، دراور، پنل */

export type VariantLike = {
  id: string;
  weight?: string | null;
  roast?: string | null;
  price?: number;
  stock?: number;
  stock_quantity?: number;
};

export function roastNorm(c: string | null | undefined): string {
  return (c || "").trim().replace(/^#/, "").toLowerCase();
}

export function sameColor(
  a?: string | null,
  b?: string | null,
): boolean {
  if (!a || !b) return false;
  return roastNorm(a) === roastNorm(b);
}

export function stockOf(v: VariantLike): number {
  return Number(v.stock ?? v.stock_quantity ?? 0);
}

/** آیا این مناسبت‌ها برای وضعیت محصول انتخاب‌شده (یا بدون وضعیت محصول) موجود است؟ */
export function sizeAvailable(
  weight: string,
  variants: VariantLike[],
  selectedColor?: string | null,
): boolean {
  if (!variants.length) return true;
  if (!selectedColor) {
    return variants.some((v) => v.weight === weight && stockOf(v) > 0);
  }
  return variants.some(
    (v) =>
      v.weight === weight &&
      (!v.roast || sameColor(v.roast, selectedColor)) &&
      stockOf(v) > 0,
  );
}

/** آیا این وضعیت محصول حداقل یک مناسبت‌ها موجود دارد؟ */
export function colorAvailable(
  roast: string,
  variants: VariantLike[],
  selectedSize?: string | null,
): boolean {
  if (!variants.length) return true;
  if (!selectedSize) {
    return variants.some(
      (v) => (!v.roast || sameColor(v.roast, roast)) && stockOf(v) > 0,
    );
  }
  return variants.some(
    (v) =>
      (!v.roast || sameColor(v.roast, roast)) &&
      v.weight === selectedSize &&
      stockOf(v) > 0,
  );
}

/** variant دقیق برای ترکیب وضعیت محصول+مناسبت‌ها */
export function findVariant(
  variants: VariantLike[],
  selectedColor?: string | null,
  selectedSize?: string | null,
): VariantLike | undefined {
  return variants.find((v) => {
    const weightOk = !selectedSize || !v.weight || v.weight === selectedSize;
    const roastOk =
      !selectedColor || !v.roast || sameColor(v.roast, selectedColor);
    return weightOk && roastOk;
  });
}

/** کلید ساده برای تطبیق نام فایل تصویر با وضعیت محصول */
export function roastKey(c: string): string {
  const n = roastNorm(c);
  if (
    n.includes("سفید") ||
    n === "white" ||
    n === "fff" ||
    n === "ffffff"
  )
    return "white";
  if (
    n.includes("مشکی") ||
    n.includes("سیاه") ||
    n === "black" ||
    n === "000" ||
    n === "000000"
  )
    return "black";
  if (
    n.includes("آبی") ||
    n.includes("ابي") ||
    n === "blue" ||
    n.includes("1e3a8a") ||
    n.includes("2563eb")
  )
    return "blue";
  return n;
}

export function imageIndexForColor(
  roast: string,
  imgs: string[],
  roasts: string[] = [],
): number {
  if (!roast || !imgs.length) return 0;
  const key = roastKey(roast);
  const idx = imgs.findIndex((u) => {
    const low = (u || "").toLowerCase();
    return (
      low.includes(key) ||
      (key === "white" && low.includes("white")) ||
      (key === "black" && low.includes("black")) ||
      (key === "blue" && low.includes("blue"))
    );
  });
  if (idx >= 0) return idx;
  const ci = roasts.findIndex((x) => roastNorm(x) === roastNorm(roast));
  if (ci >= 0 && ci < imgs.length) return ci;
  return 0;
}


/** موجود بودن ترکیب وضعیت محصول+مناسبت‌ها — یک منبع برای PDP / دراور / کارت */
export function isVariantAvailable(
  variants: Array<{
    roast?: string | null;
    roast_hex?: string | null;
    roastHex?: string | null;
    weight?: string | null | { name?: string };
    stock?: number | null;
    stock_quantity?: number | null;
    is_active?: boolean | null;
  }>,
  roastHex?: string | null,
  weight?: string | null,
): boolean {
  const norm = (s?: string | null) =>
    (s || "").trim().replace(/^#/, "").toLowerCase();
  const wantHex = norm(roastHex);
  const wantSize = (weight || "").trim().toUpperCase();
  const match = variants.find((v) => {
    const hex = norm(v.roast_hex || v.roastHex || v.roast);
    const szRaw = v.weight;
    const sz =
      typeof szRaw === "string"
        ? szRaw.trim().toUpperCase()
        : szRaw && typeof szRaw === "object"
          ? String(szRaw.name || "").trim().toUpperCase()
          : "";
    const roastOk = !wantHex || hex === wantHex;
    const weightOk = !wantSize || sz === wantSize;
    return roastOk && weightOk;
  });
  if (!match) return false;
  if (match.is_active === false) return false;
  const stock = match.stock_quantity ?? match.stock;
  if (stock !== null && stock !== undefined && Number(stock) <= 0) return false;
  return true;
}
