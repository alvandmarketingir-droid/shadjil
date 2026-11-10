import type { ProductImageSizeName } from "@/lib/process-product-image";

/**
 * از URL یا key مربوط به large، URL وزن دیگر را می‌سازد.
 * قرارداد: .../{ts}-large.webp → .../{ts}-{weight}.webp
 */
export function productImageUrlForSize(
  largeUrlOrKey: string,
  weight: ProductImageSizeName,
): string {
  return largeUrlOrKey.replace(
    /-(thumb|small|medium|large)\.webp(\?.*)?$/,
    `-${weight}.webp`,
  );
}
