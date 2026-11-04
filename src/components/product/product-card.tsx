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

  const sizes = [
    ...new Set(
      variants
        .map((v) => {
          const x = v as {
            size?: string | { name?: string | null } | null;
          };
          if (typeof x.size === "string" && x.size) return x.size;
          if (x.size && typeof x.size === "object" && x.size.name) return x.size.name;
          return null;
        })
        .filter((s): s is string => Boolean(s))
    ),
  ];

  // لیست یکتای رنگ: hex واقعی برای سواچ
  const colorEntries: { name: string; hex: string }[] = [];
  {
    const seen = new Set<string>();
    for (const v of variants) {
      const x = v as {
        color_hex?: string | null;
        color?: string | { name?: string | null; hex?: string | null; hex_code?: string | null } | null;
        color_name?: string | null;
      };
      const name =
        (x.color_name || "").trim() ||
        (typeof x.color === "string" ? x.color : x.color?.name || "") ||
        "";
      const hex = resolveColorHex(
        name || x.color_hex,
        x.color_hex ||
          (x.color && typeof x.color === "object"
            ? x.color.hex_code || x.color.hex
            : null),
      );
      const key = name || hex;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      colorEntries.push({ name: name || hex, hex });
    }
  }
  const colors = colorEntries.map((c) => c.hex);

  
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
      size?: string | { name?: string | null } | null;
      color?: string | { name?: string | null; hex_code?: string | null; hex?: string | null } | null;
      color_name?: string | null;
      color_hex?: string | null;
    };
    const sizeName =
      typeof x.size === "string"
        ? x.size
        : x.size && typeof x.size === "object"
          ? x.size.name ?? null
          : null;
    const name =
      (x.color_name || "").trim() ||
      (typeof x.color === "string" ? x.color : x.color?.name || "") ||
      "";
    const colorVal = resolveColorHex(
      name || x.color_hex,
      x.color_hex ||
        (x.color && typeof x.color === "object"
          ? x.color.hex_code || x.color.hex
          : null),
    );
    return {
      id: x.id,
      price: Number(x.price),
      size: sizeName,
      color: colorVal,
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
        colors={colors}
        sizes={sizes}
        variantOptions={variantOptions}
        isNew={Boolean(product.is_new)}
        isBestSeller={Boolean(product.is_bestseller)}
        discount={discount}
        freeShipping={Boolean((product as { free_shipping?: boolean }).free_shipping)}
      />
  );
}
