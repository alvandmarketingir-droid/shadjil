"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ProductGallery,
  type GalleryImage,
} from "@/components/product/product-gallery";
import {
  ProductBuyBox,
  type BuyVariant,
} from "@/components/product/product-buy-box";

function roastNorm(c: string | null | undefined) {
  return (c || "").trim().replace(/^#/, "").toLowerCase();
}

type Props = {
  productId: string;
  productName: string;
  href: string;
  fallbackImage?: string | null;
  images: GalleryImage[];
  variants: BuyVariant[];
  /** موبایل: اول صفحه (نام + بج) */
  childrenTitle?: ReactNode;
  /** موبایل: بعد از تصویر، قبل از Buy Box */
  childrenBeforeBuy?: ReactNode;
  /** موبایل: بعد از افزودن، قبل از نمودار | دسکتاپ: زیر نمودار قیمت */
  childrenSpecs?: ReactNode;
  childrenAfterBuy?: ReactNode;
  childrenBelowGallery?: ReactNode;
};

export function ProductPdpGalleryAndBuy({
  productId,
  productName,
  href,
  fallbackImage,
  images,
  variants,
  childrenTitle,
  childrenBeforeBuy,
  childrenSpecs,
  childrenAfterBuy,
  childrenBelowGallery,
}: Props) {
  const firstColor =
    variants.find((v) => v.roast)?.roast?.trim() || null;

  const [activeColor, setActiveColor] = useState<string | null>(firstColor);

  const onColorChange = useCallback((c: string) => {
    setActiveColor(c);
  }, []);

  const cartImage = useMemo(() => {
    if (!activeColor) return fallbackImage;
    const want = roastNorm(activeColor);
    const ids = new Set(
      variants.filter((v) => roastNorm(v.roast) === want).map((v) => v.id),
    );
    const hit = images.find((i) => i.variant_id && ids.has(i.variant_id));
    if (hit?.url) return hit.url;
    const hints: Record<string, string[]> = {
      سفید: ["white"],
      مشکی: ["black"],
      آبی: ["blue"],
    };
    const h = hints[activeColor.trim()] ?? [];
    const byUrl = images.find((i) =>
      h.some((x) => i.url.toLowerCase().includes(x)),
    );
    return byUrl?.url ?? fallbackImage;
  }, [activeColor, variants, images, fallbackImage]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:gap-8 lg:items-start">
      {/* تصویر — موبایل: بعد از عنوان */}
      <div className="max-lg:order-2 min-w-0 w-full overflow-hidden max-lg:mb-2">
        <ProductGallery
          productName={productName}
          images={images}
          variants={variants}
          activeColor={activeColor}
          productId={productId}
          href={href}
        />
        <div className="mt-4 hidden lg:block space-y-6">
          <div className="mt-6 md:mt-5">{childrenBelowGallery}</div>
          {childrenSpecs}
        </div>
      </div>

      <div className="max-lg:contents w-full max-w-xl space-y-6 lg:justify-self-start lg:max-w-none">
        {/* موبایل order-1: نام + بج | دسکتاپ: بالای ستون خرید */}
        {childrenTitle ? (
          <div className="max-lg:order-1 space-y-2">{childrenTitle}</div>
        ) : null}

        {/* موبایل order-3: خلاصه/مشخصات بعد از تصویر */}
        {childrenBeforeBuy ? (
          <div className="max-lg:order-3 max-lg:mt-6 space-y-6 lg:mt-0">{childrenBeforeBuy}</div>
        ) : null}

        <div className="max-lg:order-4">
          <ProductBuyBox
            productId={productId}
            title={productName}
            image={cartImage ?? undefined}
            href={href}
            variants={variants}
            onColorChange={onColorChange}
          />
        </div>

        {childrenSpecs ? (
          <div className="max-lg:order-5 space-y-6 lg:hidden">{childrenSpecs}</div>
        ) : null}
        <div className="max-lg:order-6 mt-6 lg:hidden"><div className="mt-6 md:mt-5">{childrenBelowGallery}</div></div>
        <div className="max-lg:order-7">{childrenAfterBuy}</div>
      </div>
    </div>
  );
}
