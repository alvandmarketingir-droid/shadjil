"use client";

import { ensureAlt } from "@/lib/seo/image-alt";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { ProductWishCompareStack } from "@/components/product/product-wish-compare";
import { roastNorm, roastKey } from "@/lib/variant-availability";

export type GalleryImage = {
  url: string;
  is_primary?: boolean;
  alt?: string | null;
  variant_id?: string | null;
};

type VariantLite = { id: string; roast?: string | null };

/**
 * استاندارد فروشگاه‌های بزرگ:
 * - تامب‌نیل = تصاویر گالری محصول (ثابت، وابسته به وضعیت محصول نیست)
 * - تصویر بزرگ = عکس واریانت وضعیت محصول فعال، وگرنه تامب انتخاب‌شده / اول گالری
 * - لایت‌باکس = ورق زدن بین تصاویر گالری با فلش چپ/راست
 */
export function ProductGallery({
  images,
  productName,
  variants = [],
  activeColor = null,
  productId,
  href,
}: {
  images: GalleryImage[];
  productName: string;
  variants?: VariantLite[];
  activeColor?: string | null;
  productId?: string;
  href?: string;
}) {
  // --- تامب‌نیل: فقط گالری (بدون variant_id) ---
  const thumbs = useMemo(() => {
    const all = images.filter((i) => i.url);
    const galleryOnly = all.filter((i) => !i.variant_id);
    const list = galleryOnly.length > 0 ? galleryOnly : all;
    // شاخص اول، بعد گالری
    return [...list].sort((a, b) => {
      const ap = a.is_primary ? 0 : 1;
      const bp = b.is_primary ? 0 : 1;
      return ap - bp;
    });
  }, [images]);

  // --- عکس واریانت وضعیت محصول فعال (فقط برای تصویر بزرگ) ---
  const variantMain = useMemo(() => {
    if (!activeColor) return null;
    const want = roastNorm(activeColor);
    const key = roastKey(activeColor);
    const all = images.filter((i) => i.url);

    if (variants.length) {
      const ids = new Set(
        variants
          .filter((v) => {
            if (!v.roast) return false;
            return roastNorm(v.roast) === want || roastKey(v.roast) === key;
          })
          .map((v) => v.id),
      );
      const byVar = all.find(
        (img) => img.variant_id && ids.has(img.variant_id),
      );
      if (byVar) return byVar;
    }

    // fallback: url شامل نام وضعیت محصول
    return (
      all.find((img) => {
        if (!img.variant_id) return false;
        const low = img.url.toLowerCase();
        return (
          low.includes(key) ||
          (key === "white" && low.includes("white")) ||
          (key === "black" && low.includes("black")) ||
          (key === "blue" && low.includes("blue"))
        );
      }) ?? null
    );
  }, [images, variants, activeColor]);

  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  // کاربر خودش تامب زده → اولویت با تامب، نه واریانت
  const [preferThumb, setPreferThumb] = useState(false);

  // با عوض شدن وضعیت محصول: دوباره عکس واریانت اولویت دارد
  useEffect(() => {
    setPreferThumb(false);
  }, [activeColor]);

  // وقتی تعداد تامب عوض شد ایندکس را امن نگه دار
  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(0, thumbs.length - 1)));
  }, [thumbs.length]);

  const thumbCurrent =
    thumbs[Math.min(idx, Math.max(0, thumbs.length - 1))] ?? thumbs[0] ?? null;

  // تصویر بزرگ: اگر کاربر تامب نزده و واریانت عکس دارد → واریانت
  const main =
    (!preferThumb && variantMain) || thumbCurrent || variantMain || null;

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => {
    setPreferThumb(true);
    setIdx((i) => (thumbs.length ? (i - 1 + thumbs.length) % thumbs.length : 0));
  }, [thumbs.length]);
  const next = useCallback(() => {
    setPreferThumb(true);
    setIdx((i) => (thumbs.length ? (i + 1) % thumbs.length : 0));
  }, [thumbs.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") prev();
      if (e.key === "ArrowLeft") next();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, prev, next]);

  if (!main) {
    return (
      <div className="bg-muted text-muted-foreground relative flex aspect-[4/5] w-full max-w-full items-center justify-center overflow-hidden rounded-xl lg:aspect-[1/1]">
        بدون تصویر
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* تصویر بزرگ */}
      <div className="bg-muted relative aspect-[4/5] w-full max-w-full overflow-hidden rounded-xl lg:aspect-[1/1]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseMove={(e) => {
            if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
              const r = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - r.left) / r.width) * 100;
              const y = ((e.clientY - r.top) / r.height) * 100;
              setZoomPos({ x, y });
            }
          }}
          onMouseLeave={() => setZoomPos(null)}
          className="absolute inset-0 z-10 cursor-zoom-in border-0 p-0 text-left"
          aria-label="بزرگ‌نمایی تصویر"
        >
          <Image
            key={main.url + String(activeColor) + String(preferThumb)}
            src={main.url}
            alt={ensureAlt(main.alt, { pageName: productName })}
            fill
            className={
              "object-cover object-center transition-transform duration-150 " +
              (zoomPos ? "scale-[1.75]" : "scale-100")
            }
            style={
              zoomPos
                ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                : undefined
            }
            weights="(max-width: 1024px) 100vw, 50vw"
            priority
          />
          <span className="bg-background/80 text-muted-foreground pointer-events-none absolute bottom-3 left-3 rounded-lg px-2 py-1 text-[11px] backdrop-blur-sm max-lg:hidden">
            هاور برای زوم · کلیک برای تمام‌صفحه
          </span>
          <span className="bg-background/80 text-muted-foreground pointer-events-none absolute bottom-3 left-3 rounded-lg px-2 py-1 text-[11px] backdrop-blur-sm lg:hidden">
            کلیک برای مشاهده کامل
          </span>
        </button>
        {productId ? (
          <ProductWishCompareStack
            item={{
              id: productId,
              title: productName,
              image: main.url,
              href: href,
            }}
          />
        ) : null}
      </div>

      {/* تامب‌نیل‌ها — همیشه گالری، ثابت با تغییر وضعیت محصول */}
      {thumbs.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {thumbs.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => {
                setIdx(i);
                setPreferThumb(true);
              }}
              className={cn(
                "relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 p-0",
                preferThumb && i === idx
                  ? "border-secondary"
                  : "border-transparent opacity-80",
              )}
            >
              <Image
                src={img.url}
                alt={ensureAlt(null, { pageName: productName })}
                fill
                className="object-cover p-0"
                weights="56px"
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* لایت‌باکس استاندارد با فلش چپ/راست */}
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 left-4 z-[101] rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="بستن"
          >
            <X className="h-6 w-6" />
          </button>

          {thumbs.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 top-1/2 z-[101] -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:right-6"
                aria-label="قبلی"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 top-1/2 z-[101] -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 md:left-6"
                aria-label="بعدی"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
            </>
          ) : null}

          <div
            className="relative flex max-h-[90vh] max-w-[95vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={main.url}
              src={main.url}
              alt={ensureAlt(main.alt, { pageName: productName })}
              className="max-h-[90vh] max-w-[95vw] object-contain"
            />
          </div>

          {thumbs.length > 1 ? (
            <div className="absolute bottom-4 left-1/2 z-[101] -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
              {Math.min(idx + 1, thumbs.length)} / {thumbs.length}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
