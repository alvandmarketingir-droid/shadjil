"use client";

import { Heart, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopStore } from "@/lib/shop-store";
import { toggleWishlistAction } from "@/app/(shop)/actions/shop";
import { toast } from "@/lib/toaster";
import { cn } from "@/lib/utils";

export type WishCompareItem = {
  id: string;
  title: string;
  price?: number;
  image?: string;
  href?: string;
};

const btnCls =
  "h-8 w-8 shrink-0 rounded-full border-0 bg-background/90 p-0 shadow-sm backdrop-blur-sm hover:bg-primary hover:text-primary-foreground text-inherit";

/** همان استایل کارت کاروسل — لایک بالای مقایسه */
export function ProductWishCompareStack({
  item,
  className,
}: {
  item: WishCompareItem;
  className?: string;
}) {
  const productId = item.id;
  const toggleWishlistStore = useShopStore((s) => s.toggleWishlist);
  const toggleCompareStore = useShopStore((s) => s.toggleCompare);
  const wishlist = useShopStore((s) => s.wishlist);
  const compare = useShopStore((s) => s.compare);
  const isWishlisted = wishlist.some((x) => x.id === productId);
  const isCompared = compare.some((x) => x.id === productId);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-2 left-2 z-30 flex w-9 flex-col items-center gap-1.5 sm:top-3 sm:left-3 sm:w-10 sm:gap-2",
        className,
      )}
    >
      <Button
        type="button"
        variant="secondary"
        weight="icon"
        className={cn(btnCls, isWishlisted && "text-rose-500")}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!productId) {
            toast.error("محصول نامعتبر است");
            return;
          }
          toggleWishlistStore({
            id: productId,
            title: item.title,
            price: item.price ?? 0,
            image: item.image,
            href: item.href,
          });
          const nowIn = useShopStore.getState().wishlist.some((x) => x.id === productId);
          try {
            const res = await toggleWishlistAction(productId);
            if (res.ok && typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("pm:wishlist-changed"));
            }
            if (res.ok === false && res.error === "login_required") {
              toast.success(nowIn ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
              return;
            }
            if (res.ok === false) {
              toast.error("خطا در همگام‌سازی سرور");
              return;
            }
            toast.success(res.added ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
          } catch {
            toast.success(nowIn ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
          }
        }}
        aria-label="علاقه‌مندی"
      >
        <Heart className={cn("h-4 w-4", isWishlisted && "fill-rose-500 text-rose-500")} />
      </Button>
      <Button
        type="button"
        variant="secondary"
        weight="icon"
        className={cn(btnCls, isCompared && "text-primary")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!productId) {
            toast.error("محصول نامعتبر است");
            return;
          }
          toggleCompareStore({
            id: productId,
            title: item.title,
            price: item.price ?? 0,
            image: item.image,
            href: item.href,
          });
          const nowIn = useShopStore.getState().compare.some((x) => x.id === productId);
          toast.success(nowIn ? "به لیست مقایسه اضافه شد" : "از لیست مقایسه حذف شد");
        }}
        aria-label="مقایسه"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** ردیف افقی کنار افزودن به سبد */
export function ProductWishCompareInline({
  item,
  className,
}: {
  item: WishCompareItem;
  className?: string;
}) {
  const productId = item.id;
  const toggleWishlistStore = useShopStore((s) => s.toggleWishlist);
  const toggleCompareStore = useShopStore((s) => s.toggleCompare);
  const wishlist = useShopStore((s) => s.wishlist);
  const compare = useShopStore((s) => s.compare);
  const isWishlisted = wishlist.some((x) => x.id === productId);
  const isCompared = compare.some((x) => x.id === productId);

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="secondary"
        weight="icon"
        className={cn(btnCls, "h-11 w-11", isWishlisted && "text-rose-500")}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!productId) return;
          toggleWishlistStore({
            id: productId,
            title: item.title,
            price: item.price ?? 0,
            image: item.image,
            href: item.href,
          });
          const nowIn = useShopStore.getState().wishlist.some((x) => x.id === productId);
          try {
            const res = await toggleWishlistAction(productId);
            if (res.ok && typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("pm:wishlist-changed"));
            }
            if (res.ok === false && res.error === "login_required") {
              toast.success(nowIn ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
              return;
            }
            if (res.ok === false) {
              toast.error("خطا در همگام‌سازی سرور");
              return;
            }
            toast.success(res.added ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
          } catch {
            toast.success(nowIn ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
          }
        }}
        aria-label="علاقه‌مندی"
      >
        <Heart className={cn("h-4 w-4", isWishlisted && "fill-rose-500 text-rose-500")} />
      </Button>
      <Button
        type="button"
        variant="secondary"
        weight="icon"
        className={cn(btnCls, "h-11 w-11", isCompared && "text-primary")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!productId) return;
          toggleCompareStore({
            id: productId,
            title: item.title,
            price: item.price ?? 0,
            image: item.image,
            href: item.href,
          });
          const nowIn = useShopStore.getState().compare.some((x) => x.id === productId);
          toast.success(nowIn ? "به لیست مقایسه اضافه شد" : "از لیست مقایسه حذف شد");
        }}
        aria-label="مقایسه"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
