"use client";


import { Price } from "@/components/ui/price";
import {
  sizeAvailable as sizeAvailableShared,
  sameColor,
  imageIndexForColor,
  colorNorm,
} from "@/lib/variant-availability";

import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { toast } from "@/lib/toaster";
import { useShopStore } from "@/lib/shop-store";
import { toggleWishlistAction } from "@/app/(shop)/actions/shop";
import { cartAdd } from "@/lib/cart-api";
import { useServerCartStore } from "@/lib/server-cart-store";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productImageUrlForSize } from "@/lib/product-image-url";

import { Card, CardContent, CardFooter } from "@/components/ui/card";


import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  Heart,
  ArrowLeftRight,
  ShoppingCart,
  Star,
  Loader2,
  Check,
} from "lucide-react";
import { toPersianDigits } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { resolveColorHex } from "@/lib/colors";
import { getCardPrice, formatToman } from "@/lib/product/card-price";

export interface ProductCard1Props {
  variantOptions?: { id: string; size?: string | null; color?: string | null; price?: number; stock?: number }[];
  productId?: string;
  href?: string;
  name?: string;
  brand?: string;
  price?: number;
  /** حداکثر قیمت (برای بازه) */
  priceTo?: number;
  originalPrice?: number;
  /** وقتی واریانت‌ها بازه قیمت دارند */
  showFrom?: boolean;
  rating?: number;
  reviewCount?: number;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
  discount?: number;
  freeShipping?: boolean;
  category?: string;
  categoryHref?: string;
  brandHref?: string;
  isSpecialSale?: boolean;
  className?: string;
}


export function ProductCard1({
  productId,
  variantOptions = [],
  href,
  name = "محصول",
  price = 0,
  priceTo,
  originalPrice,
  showFrom = false,
  rating = 0,
  reviewCount = 0,
  images = [],
  colors = [],
  sizes = [],
  isNew = false,
  isBestSeller = false,
  discount = 0,
  freeShipping = false,
  category,
  categoryHref,
  className,
  brand,
  brandHref,
  isSpecialSale = false,
}: ProductCard1Props) {
  const safeImages =
    images.length > 0 ? images : [];
  const hasImage = safeImages.length > 0;

  function colorNorm(c: string) {
    return (c || "").trim().replace(/^#/, "").toLowerCase();
  }

  /** نگاشت ساده نام/هگز فارسی → کلید فایل */
  function colorKey(c: string) {
    const n = colorNorm(c);
    if (n.includes("سفید") || n === "white" || n === "fff" || n === "ffffff") return "white";
    if (n.includes("مشکی") || n.includes("سیاه") || n === "black" || n === "000" || n === "000000") return "black";
    if (n.includes("آبی") || n.includes("ابي") || n === "blue" || n.includes("1e3a8a") || n.includes("2563eb")) return "blue";
    return n;
  }

  function imageIndexForColor(color: string, imgs: string[]): number {
    if (!color || !imgs.length) return 0;
    const key = colorKey(color);
    const idx = imgs.findIndex((u) => {
      const low = (u || "").toLowerCase();
      return low.includes(key) || (key === "white" && (low.includes("white") || low.includes("سفید")))
        || (key === "black" && (low.includes("black") || low.includes("مشکی")))
        || (key === "blue" && (low.includes("blue") || low.includes("آبی")));
    });
    if (idx >= 0) return idx;
    // اگر تعداد تصاویر ≈ تعداد رنگ‌ها، از ایندکس رنگ استفاده کن
    const ci = colors.findIndex((x) => colorNorm(x) === colorNorm(color));
    if (ci >= 0 && ci < imgs.length) return ci;
    return 0;
  }



    const router = useRouter();
  const toggleWishlistStore = useShopStore((s) => s.toggleWishlist);
  const toggleCompareStore = useShopStore((s) => s.toggleCompare);
  const addToCartStore = useShopStore((s) => s.addToCart);
  const refreshServerCart = useServerCartStore((s) => s.refresh);
  const compare = useShopStore((s) => s.compare);
  const wishlist = useShopStore((s) => s.wishlist);
  const isWishlisted = productId
    ? wishlist.some((x) => x.id === productId)
    : false;
  const isCompared = productId
    ? compare.some((x) => x.id === productId)
    : false;
  const [currentImageIndex, setCurrentImageIndex] = useState(() =>
    imageIndexForColor(colors[0] ?? "", images.length ? images : [])
  );
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
      const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  
  function sameColor(a?: string | null, b?: string | null) {
    if (!a || !b) return false;
    return (a || "").trim().replace(/^#/, "").toLowerCase() === (b || "").trim().replace(/^#/, "").toLowerCase();
  }
  function sizeAvailable(size: string) {
    return sizeAvailableShared(size, variantOptions ?? [], selectedColor);
  }

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasImage) return;
    setCurrentImageIndex((prev) => (prev + 1) % safeImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasImage) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + safeImages.length) % safeImages.length
    );
  };

      async function handleAddToCart(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!productId) {
      toast.error("محصول نامعتبر است");
      return;
    }
    if ((sizes?.length ?? 0) > 0 && !selectedSize) {
      toast.error("سایز را انتخاب کنید");
      return;
    }
    // match variant
    const opts = variantOptions ?? [];
    let variantId: string | undefined;
    if (opts.length) {
      const match = opts.find((v) => {
        const sizeOk = !selectedSize || !v.size || v.size === selectedSize;
        const colorOk =
          !selectedColor ||
          !v.color ||
          v.color === selectedColor ||
          v.color?.toLowerCase() === selectedColor?.toLowerCase();
        return sizeOk && colorOk;
      });
      variantId = match?.id ?? opts[0]?.id;
    }
    if (!variantId) {
      toast.error("این ترکیب موجود نیست");
      return;
    }
    setIsAddingToCart(true);
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pm:open-panel", { detail: { tab: "cart" } }));
      }
      const res = await cartAdd({
        variantId,
        productId,
        title: name ?? "محصول",
        price: price ?? 0,
        quantity: 1,
        image: (images && images[0]) || undefined,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
      });
      if (!res.ok) {
        toast.error(res.error?.startsWith("insufficient_stock") ? "موجودی کافی نیست" : "خطا در افزودن به سبد");
      } else {
        setIsAddedToCart(true);
        toast.success("به سبد خرید اضافه شد");
        setTimeout(() => setIsAddedToCart(false), 1500);
      }
    } finally {
      setIsAddingToCart(false);
    }
  }



  const card = (
    <Card
      className={cn(
        "h-full w-full flex flex-col overflow-hidden rounded-2xl border bg-card text-foreground shadow-sm p-0 gap-0",
        className
      )}
    >
      {/* Image */}
 <div className="m-0 p-0 relative aspect-square w-full overflow-hidden bg-muted">

        {/* Like + Compare — left column only */}
        <div className="pointer-events-auto absolute top-2 left-2 z-30 flex w-9 flex-col items-center gap-1.5 sm:top-3 sm:left-3 sm:w-10 sm:gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={`h-8 w-8 shrink-0 rounded-full border-0 bg-background/90 p-0 shadow-sm backdrop-blur-sm hover:bg-primary hover:text-primary-foreground ${
              isWishlisted ? "text-rose-500" : ""
            } text-inherit`}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!productId) {
                toast.error("محصول نامعتبر است");
                return;
              }
              const item = {
                id: productId,
                title: name ?? "محصول",
                price: price ?? 0,
                image: (images && images[0]) || undefined,
                href: href,
              };
              // همیشه UI هدر / پنل کناری
              toggleWishlistStore(item);
              const nowIn = useShopStore.getState().wishlist.some((x) => x.id === productId);
              // اگر لاگین باشد، همزمان DB
              try {
                const res = await toggleWishlistAction(productId);
                
      if (res.ok && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pm:wishlist-changed"));
      }
if (res.ok === false && res.error === "login_required") {
                  // مهمان: فقط store — درست است
                  toast.success(
                    nowIn ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد"
                  );
                  return;
                }
                if (res.ok === false) {
                  toast.error("خطا در همگام‌سازی سرور");
                  return;
                }
                toast.success(
                  res.added ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد"
                );
              } catch {
                toast.success(
                  nowIn ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد"
                );
              }
            }}
            aria-label="علاقه‌مندی"
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`}
            />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={`h-8 w-8 shrink-0 rounded-full border-0 bg-background/90 p-0 shadow-sm backdrop-blur-sm hover:bg-primary hover:text-primary-foreground ${
              isCompared ? "text-primary" : ""
            } text-inherit`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!productId) {
                toast.error("محصول نامعتبر است");
                return;
              }
              const item = {
                id: productId,
                title: name ?? "محصول",
                price: price ?? 0,
                image: (images && images[0]) || undefined,
                href: href,
              };
              toggleCompareStore(item);
              const nowIn = useShopStore.getState().compare.some((x) => x.id === productId);
              toast.success(
                nowIn ? "به لیست مقایسه اضافه شد" : "از لیست مقایسه حذف شد"
              );
            }}
            aria-label="مقایسه"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Badges — vertical stack, right-aligned, full text */}
        <div className="pointer-events-auto absolute top-2 right-2 z-30 flex flex-col items-end gap-1.5 sm:top-3 sm:right-3">
          {category && categoryHref ? (
            <Link
              href={categoryHref}
              className="relative z-30 me-auto inline-flex w-fit shrink-0 self-start no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Badge className="me-auto w-fit self-start border-0 bg-violet-100 px-2.5 py-1 text-left text-[10px] leading-tight whitespace-nowrap text-violet-800 shadow-none transition-none hover:bg-violet-100 hover:text-violet-800 sm:text-xs dark:bg-violet-100 dark:text-violet-800 dark:hover:bg-violet-100 dark:hover:text-violet-800">
                {category}
              </Badge>
            </Link>
          ) : category ? (
            <Badge className="me-auto w-fit self-start border-0 bg-violet-100 px-2.5 py-1 text-left text-[10px] leading-tight whitespace-nowrap text-violet-800 shadow-none transition-none hover:bg-violet-100 hover:text-violet-800 sm:text-xs dark:bg-violet-100 dark:text-violet-800 dark:hover:bg-violet-100 dark:hover:text-violet-800">
              {category}
            </Badge>
          ) : null}
          {brand && brandHref ? (
            <Link
              href={brandHref}
              className="relative z-30 me-auto inline-flex w-fit shrink-0 self-start no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Badge className="me-auto w-fit self-start border-0 bg-emerald-100 px-2.5 py-1 text-left text-[10px] leading-tight whitespace-nowrap text-emerald-800 shadow-none transition-none hover:bg-emerald-100 hover:text-emerald-800 sm:text-xs dark:bg-emerald-100 dark:text-emerald-800 dark:hover:bg-emerald-100 dark:hover:text-emerald-800">
                {brand}
              </Badge>
            </Link>
          ) : brand ? (
            <Badge className="me-auto w-fit self-start border-0 bg-emerald-100 px-2.5 py-1 text-left text-[10px] leading-tight whitespace-nowrap text-emerald-800 shadow-none transition-none hover:bg-emerald-100 hover:text-emerald-800 sm:text-xs dark:bg-emerald-100 dark:text-emerald-800 dark:hover:bg-emerald-100 dark:hover:text-emerald-800">
              {brand}
            </Badge>
          ) : null}
        </div>

        {/* شگفت‌انگیز — پایین سمت راست تصویر */}
        {isSpecialSale ? (
          <div className="pointer-events-none absolute bottom-2 right-2 z-20 sm:bottom-3 sm:right-3">
            <Badge className="me-auto w-fit self-start border-0 bg-rose-100 px-2.5 py-1 text-left text-[10px] leading-tight whitespace-nowrap text-rose-800 shadow-none sm:text-xs dark:bg-rose-100 dark:text-rose-800 dark:hover:bg-rose-100 dark:hover:text-rose-800">
              شگفت‌انگیز
            </Badge>
          </div>
        ) : null}


        {/* Actions: like on top, compare under — all breakpoints */}
        {/* Badges: ONE horizontal row — New | Category | Brand (no wrap on mobile) */}
        {/* بج‌ها افقی: جدید | دسته | برند */}
        {/* لایک + مقایسه کنار هم */}
        {hasImage ? (
          // Plain img + CSS fade (same 250ms as former motion.img); prefer -small.webp.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentImageIndex}
            src={productImageUrlForSize(safeImages[currentImageIndex], "small")}
            alt={name}
            width={480}
            height={480}
            loading="lazy"
            decoding="async"
            className="z-0 absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-[250ms] data-[ready=true]:opacity-100"
            onLoad={(e) => {
              e.currentTarget.dataset.ready = "true";
            }}
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center px-4 text-center text-sm">
            بدون تصویر
          </div>
        )}
{/* Badges — start (RTL right) */}
        {/* Wishlist — end (RTL left) */}
        </div>

      {/* Content — balanced spacing */}
      <CardContent className="mt-[3px] flex flex-1 flex-col space-y-3 bg-white p-3 dark:bg-[#2A2E32] sm:space-y-2.5">
        <div className="space-y-1">
          {brand ? (
            <p className="text-muted-foreground text-[11px] leading-4 tracking-wide">
              {brand}
            </p>
          ) : null}
          <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="block w-full max-w-full cursor-default text-start">
                        <span className="font-iranyekan-heavy block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-5 sm:text-[15px] block w-full overflow-hidden text-ellipsis whitespace-nowrap">
                          {name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-sm">
                        {name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

          {(rating > 0 || freeShipping) && (
            <div className="flex items-center gap-2 pt-0.5">
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span className="text-xs font-medium">
                    {toPersianDigits(rating.toFixed(1))}
                  </span>
                  {reviewCount > 0 && (
                    <span className="text-muted-foreground text-[11px]">
                      ({toPersianDigits(String(reviewCount))})
                    </span>
                  )}
                </div>
              )}
              {freeShipping && (
                <span className="ms-auto text-[11px] font-medium text-emerald-600">
                  ارسال رایگان
                </span>
              )}
            </div>
          )}
        </div>

        {/* Colors / sizes — always reserve same height so cards match */}
        <div className="flex min-h-[3.25rem] flex-col justify-end gap-1.5">
          {colors.length > 0 && (
            <div className="flex items-center gap-1.5">
              {colors.slice(0, 5).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-5 w-5 rounded-full border border-black/20 shadow-sm transition-all",
                    selectedColor === color
                      ? "ring-primary ring-2 ring-offset-1"
                      : ""
                  )}
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColor(color);
                    setCurrentImageIndex(imageIndexForColor(color, safeImages));
                  }}
                  aria-label={`رنگ ${color}`}
                />
              ))}
            </div>
          )}

          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sizes.slice(0, 6).map((size) => {
                const ok = sizeAvailable(size);
                return (
                <button
                  key={size}
                  type="button"
                  disabled={!ok}
                  title={ok ? size : `سایز ${size} برای این رنگ تعریف نشده`}
                  className={cn(
                    "h-7 min-w-[2rem] rounded-md px-1.5 text-[11px] font-medium transition-all",
                    selectedSize === size && ok
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/70 text-foreground",
                    !ok && "cursor-not-allowed opacity-35 line-through"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (ok) setSelectedSize(size);
                  }}
                >
                  {size}
                </button>
              );})}
            </div>
          )}
        </div>

        {/* Price — همیشه دقیقاً دو خط برای ارتفاع یکسان کارت‌ها */}
        <div className="mt-auto flex min-h-[2.75rem] flex-col justify-end gap-0.5 leading-tight">
          {originalPrice != null && originalPrice > price ? (
            <>
              {/* خط ۱: قیمت اصلی با خط نرم */}
              <span className="text-xs opacity-70">
                <Price amount={originalPrice} size="sm" strike />
              </span>
              {/* خط ۲: قیمت نهایی + کلمه تخفیف */}
              <span className="flex flex-wrap items-baseline gap-x-1.5 text-base font-bold tracking-tight sm:text-[17px]">
                <Price amount={price} size="sm" />
                <span className="text-xs font-medium text-rose-400 dark:text-rose-300">تخفیف</span>
              </span>
            </>
          ) : showFrom && priceTo != null && priceTo > price ? (
            <>
              {/* خط ۱: از حداقل */}
              <span className="text-base font-bold tracking-tight sm:text-[17px]">
                <span className="ml-1 text-xs font-normal opacity-80">از </span>
                <Price amount={price} size="sm" />
              </span>
              {/* خط ۲: تا حداکثر */}
              <span className="text-sm font-medium tracking-tight text-muted-foreground">
                <span className="ml-1 text-xs font-normal opacity-80">تا </span>
                <Price amount={priceTo} size="sm" />
              </span>
            </>
          ) : (
            <>
              {/* تک‌قیمت: هر دو خط همان قیمت */}
              <span className="text-base font-bold tracking-tight sm:text-[17px]">
                <Price amount={price} size="sm" />
              </span>
              <span className="text-base font-bold tracking-tight opacity-0 sm:text-[17px] select-none pointer-events-none">
                <Price amount={price} size="sm" />
              </span>
            </>
          )}
        </div>

      </CardContent>

      <CardFooter className="border-0 bg-white p-3 pt-0 dark:bg-[#2A2E32]">
        <Button
          type="button"
          className="h-10 w-full rounded-xl text-sm font-medium"
          onClick={handleAddToCart}
          disabled={isAddingToCart || isAddedToCart}
        >
          {isAddingToCart ? (
            <>
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              در حال افزودن...
            </>
          ) : isAddedToCart ? (
            <>
              <Check className="ms-2 h-4 w-4" />
              اضافه شد
            </>
          ) : (
            <>
              <ShoppingCart className="ms-2 h-4 w-4" />
              افزودن به سبد
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  if (href) {
    return (
      <div className="relative block w-full h-full flex flex-col">
        <Link
          href={href}
          className="absolute inset-0 z-[1] rounded-2xl"
          aria-label={name}
        />
        <div className="pointer-events-none relative z-[2] h-full flex flex-col [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {card}
        </div>
      </div>
    );
  }

  return card;
}