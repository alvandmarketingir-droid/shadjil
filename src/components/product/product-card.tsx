"use client";

import Link from "next/link";
import { ProductCard1 as ProductCardUI } from "@/components/ui/product-card-1";
import type { ProductWithRelations } from "@/repositories/product.repository";
import { resolveColorHex } from "@/lib/colors";
import { getCardPrice, formatToman } from "@/lib/product/card-price";

type Props = {
  product: ProductWithRelations;
};

export function ProductCard({ product }: Props) {
  const images =
    (product.images ?? [])
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
      .map((img) => img.url)
      .filter(Boolean) || [];

  const variants = product.variants?.filter((v) => v.is_active) ?? [];
  const prices = variants
    .map((v) => Number(v.price))
    .filter((n) => !Number.isNaN(n));
  const price = prices.length ? Math.min(...prices) : 0;

  const compares = variants
    .map((v) => {
      const x = v as {
        original_price?: number | null;
        compare_at_price?: number | null;
      };
      const n = Number(x.original_price ?? x.compare_at_price);
      return n;
    })
    .filter((n) => !Number.isNaN(n) && n > 0);
  const minIdx = prices.length
    ? variants
        .map((v, i) => ({ i, p: Number(v.price) }))
        .filter((x) => Number.isFinite(x.p) && x.p > 0)
        .sort((a, b) => a.p - b.p)[0]?.i
    : undefined;
  const minVariant =
    minIdx != null ? (variants[minIdx] as { original_price?: number | null; compare_at_price?: number | null }) : null;
  const minCompare = minVariant
    ? Number(minVariant.original_price ?? minVariant.compare_at_price)
    : NaN;
  let originalPrice =
    Number.isFinite(minCompare) && minCompare > price ? minCompare : null;
  const maxPrice = prices.length ? Math.max(...prices) : price;
  const showFrom = maxPrice > price;

  let discount = 0;
  if (originalPrice != null && originalPrice > price && originalPrice > 0) {
    discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  const weights = [
    ...new Set(
      variants
        .map((v) => {
          const x = v as {
            weight?: string | { name?: string | null } | null;
          };
          if (typeof x.weight === "string" && x.weight) return x.weight;
          if (x.weight && typeof x.weight === "object" && x.weight.name) return x.weight.name;
          return null;
        })
        .filter((s): s is string => Boolean(s))
    ),
  ];

  // لیست یکتای وضعیت محصول: hex واقعی برای سواچ
  const roastEntries: { name: string; hex: string }[] = [];
  {
    const seen = new Set<string>();
    for (const v of variants) {
      const x = v as {
        roast_hex?: string | null;
        roast?: string | { name?: string | null; hex?: string | null; hex_code?: string | null } | null;
        roast_name?: string | null;
      };
      const name =
        (x.roast_name || "").trim() ||
        (typeof x.roast === "string" ? x.roast : x.roast?.name || "") ||
        "";
      const hex = resolveColorHex(
        name || x.roast_hex,
        x.roast_hex ||
          (x.roast && typeof x.roast === "object"
            ? x.roast.hex_code || x.roast.hex
            : null),
      );
      const key = name || hex;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      roastEntries.push({ name: name || hex, hex });
    }
  }
  const roasts = roastEntries.map((c) => c.hex);

  
  const categoryName =
    (product as { category?: { name?: string; slug?: string } | null }).category?.name ||
    (product as { categories?: { name?: string; slug?: string }[] }).categories?.[0]?.name;

  const categorySlug =
    (product as { category?: { slug?: string } | null }).category?.slug ||
    (product as { categories?: { slug?: string }[] }).categories?.[0]?.slug;

  const categoryHref = categorySlug
    ? `/products?category=${categorySlug}`
    : categoryName
      ? `/products?category=${encodeURIComponent(categoryName)}`
      : undefined;

  
  const brandName =
    product.brand?.name ||
    (product as { brand?: { name?: string; slug?: string } | null }).brand?.name;

  const brandSlug =
    (product as { brand?: { slug?: string } | null }).brand?.slug;

  const brandHref = brandSlug
    ? `/brands/${brandSlug}`
    : undefined;

  
  const isSpecialSale = Boolean(
    (product as { is_featured?: boolean }).is_featured ||
      (product as { is_special_sale?: boolean }).is_special_sale ||
      (product as { on_sale?: boolean }).on_sale
  );

  const variantOptions = variants.map((v) => {
    const x = v as {
      id: string;
      price: number;
      stock_quantity?: number;
      stock?: number;
      weight?: string | { name?: string | null } | null;
      roast?: string | { name?: string | null; hex_code?: string | null; hex?: string | null } | null;
      roast_name?: string | null;
      roast_hex?: string | null;
    };
    const weightName =
      typeof x.weight === "string"
        ? x.weight
        : x.weight && typeof x.weight === "object"
          ? x.weight.name ?? null
          : null;
    const name =
      (x.roast_name || "").trim() ||
      (typeof x.roast === "string" ? x.roast : x.roast?.name || "") ||
      "";
    const roastVal = resolveColorHex(
      name || x.roast_hex,
      x.roast_hex ||
        (x.roast && typeof x.roast === "object"
          ? x.roast.hex_code || x.roast.hex
          : null),
    );
    return {
      id: x.id,
      price: Number(x.price),
      weight: weightName,
      roast: roastVal,
      stock: Number(x.stock_quantity ?? x.stock ?? 0),
    };
  });


  return (
    <ProductCardUI
        productId={product.id}
        href={`/products/${product.slug}`}

        category={categoryName}
        categoryHref={categoryHref}
        brand={brandName}
        brandHref={brandHref}
        isSpecialSale={isSpecialSale}
                name={product.name}
        price={price}
        priceTo={maxPrice}
        originalPrice={originalPrice ?? undefined}
        showFrom={showFrom}
        rating={typeof product.average_rating === 'number' ? product.average_rating : 0}
        reviewCount={typeof product.review_count === 'number' ? product.review_count : 0}
        images={images}
        roasts={roasts}
        weights={weights}
        variantOptions={variantOptions}
        isNew={Boolean(product.is_new)}
        isBestSeller={Boolean(product.is_bestseller)}
        discount={discount}
        freeShipping={Boolean((product as { free_shipping?: boolean }).free_shipping)}
      />
  );
}
