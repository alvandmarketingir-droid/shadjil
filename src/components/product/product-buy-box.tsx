"use client";


import { Price } from "@/components/ui/price";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toaster";
import { useShopStore } from "@/lib/shop-store";
import { cartAdd } from "@/lib/cart-api";
import { mapCartError } from "@/lib/cart-errors";
import { subscribeStockAlertAction } from "@/app/(shop)/actions/stock-alerts";
import { useServerCartStore } from "@/lib/server-cart-store";
import { cn } from "@/lib/utils";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";
import { createClient } from "@/lib/supabase/client";
import { resolveColorHex } from "@/lib/colors";
import { ProductWishCompareInline } from "@/components/product/product-wish-compare";
import { track } from "@/lib/analytics/track";

export type VariantOpt = {
  id: string;
  weight?: string | null;
  roast?: string | null;
  price?: number;
  original_price?: number | null;
  stock?: number;
};

/** alias used by pdp-media */
export type BuyVariant = VariantOpt;

type Props = {
  productId: string;
  title: string;
  image?: string;
  href?: string;
  variants: VariantOpt[];
  /** وقتی وضعیت محصول عوض می‌شود (برای همگام‌سازی گالری) */
  onColorChange?: (roast: string) => void;
};

export function ProductBuyBox({
  productId,
  title,
  image,
  href,
  variants: variantsProp,
  onColorChange,
}: Props) {
  const _addToCartStore = useShopStore((s) => s.addToCart);
  const _refreshServerCart = useServerCartStore((s) => s.refresh);

  // موجودی زنده — بدون reload صفحه
  const [variants, setVariants] = useState<VariantOpt[]>(variantsProp);

  useEffect(() => {
    setVariants(variantsProp);
  }, [variantsProp]);

  useRtEvent(RT.stock, () => {
    const ids = variantsProp.map((v) => v.id).filter(Boolean);
    if (!ids.length) return;
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("product_variants")
          .select("id, stock_quantity")
          .in("id", ids);
        if (error || !data) return;
        const map = new Map(
          data.map((r) => [r.id as string, Number(r.stock_quantity ?? 0)]),
        );
        setVariants((prev) =>
          prev.map((v) =>
            map.has(v.id) ? { ...v, stock: map.get(v.id) } : v,
          ),
        );
      } catch {
        /* silent — UI قبلی می‌ماند */
      }
    })();
  });

  const weights = useMemo(
    () =>
      [
        ...new Set(
          variants.map((v) => v.weight).filter((s): s is string => Boolean(s)),
        ),
      ],
    [variants],
  );
  const roasts = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; hex: string }[] = [];
    for (const v of variants) {
      const name = String(v.roast || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, hex: resolveColorHex(v.roast, null) || "" });
    }
    return out;
  }, [variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(
    weights.length === 1 ? weights[0]! : null,
  );
  const [selectedColor, setSelectedColor] = useState<string>(roasts[0]?.name ?? "");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (selectedColor) onColorChange?.(selectedColor);
  }, [selectedColor, onColorChange]);
  const [loading, setLoading] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertDone, setAlertDone] = useState(false);
  const [guestPhone, setGuestPhone] = useState("");

  const match = useMemo(() => {
    const roastEq = (a?: string | null, b?: string | null) => {
      if (!a || !b) return false;
      return a.trim().replace(/^#/, "").toLowerCase() === b.trim().replace(/^#/, "").toLowerCase();
    };
    // اول: وزن+وضعیت محصول دقیق
    const exact = variants.find((v) => {
      const weightOk = !weights.length || (!!selectedSize && v.weight === selectedSize);
      const roastOk =
        !roasts.length ||
        !selectedColor ||
        roastEq(v.roast, selectedColor);
      return weightOk && roastOk;
    });
    if (exact) return exact;
    // اگر وزن هنوز انتخاب نشده: اولین واریانت همان وضعیت محصول (برای قیمت زنده)
    if (selectedColor && roasts.length) {
      const byColor = variants.find((v) => roastEq(v.roast, selectedColor));
      if (byColor) return byColor;
    }
    // اگر فقط وزن انتخاب شده
    if (selectedSize && weights.length) {
      const bySize = variants.find((v) => v.weight === selectedSize);
      if (bySize) return bySize;
    }
    return variants[0];
  }, [variants, selectedSize, selectedColor, weights.length, roasts.length]);

  const price = match?.price;
  const originalPrice = match?.original_price != null ? Number(match.original_price) : null;
  const hasDiscount =
    originalPrice != null &&
    Number.isFinite(originalPrice) &&
    Number.isFinite(Number(price)) &&
    originalPrice > Number(price) &&
    Number(price) > 0;
  const stock = Number(match?.stock ?? 0);
  const outOfStock = stock <= 0;

  useEffect(() => {
    setAlertDone(false);
  }, [match?.id, outOfStock]);

  function sameColor(a?: string | null, b?: string | null) {
    if (!a || !b) return false;
    return a.trim().replace(/^#/, "").toLowerCase() === b.trim().replace(/^#/, "").toLowerCase();
  }

  function sizeAvailable(weight: string) {
    if (!selectedColor) {
      return variants.some((v) => v.weight === weight && Number(v.stock ?? 0) > 0);
    }
    return variants.some(
      (v) =>
        v.weight === weight &&
        sameColor(v.roast, selectedColor) &&
        Number(v.stock ?? 0) > 0,
    );
  }



  async function handleAdd() {
    if (weights.length > 0 && !selectedSize) {
      toast.error("وزن را انتخاب کنید");
      return;
    }
    if (!match?.id) {
      toast.error("این ترکیب موجود نیست");
      return;
    }
    if (outOfStock) {
      toast.error("این ترکیب ناموجود است");
      return;
    }
    setLoading(true);
    try {
      const addQty = Math.max(1, Number(qty) || 1);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pm:open-panel", { detail: { tab: "cart" } }));
      }
      const res = await cartAdd({
        variantId: match.id,
        productId,
        title,
        price: Number(price ?? 0),
        quantity: addQty,
        image,
        weight: selectedSize || undefined,
        roast: selectedColor || undefined,
      });
      if (!res.ok) {
        toast.error(mapCartError(res.error));
        return;
      }
      void track({
        event_name: "add_to_cart",
        product_id: productId,
        variant_id: match.id,
        quantity: addQty,
        value: Number(price ?? 0) * addQty,
      });
      toast.success("به سبد خرید اضافه شد");
    } catch (e) {
      console.error("[addToCart]", e);
      toast.error("خطا در افزودن به سبد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {roasts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">وضعیت محصول</p>
          <div className="flex flex-wrap gap-2">
            {roasts.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => { setSelectedColor(c.name); onColorChange?.(c.name); }}
                className={cn(
                  "border-border h-8 w-8 shrink-0 rounded-full border shadow-sm",
                  selectedColor === c.name && "border-primary ring-primary ring-2 ring-offset-2",
                )}
                style={{ backgroundColor: c.hex || "#e5e5e5" }}
                title={c.name}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>
      ) : null}

      {weights.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">موجودی</p>
          <div className="flex flex-wrap gap-2">
            {weights.map((s) => {
              const ok = sizeAvailable(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!ok}
                  onClick={() => ok && setSelectedSize(s)}
                  title={ok ? s : selectedColor ? `وزن ${s} برای وضعیت محصول ${selectedColor} موجود نیست` : "ناموجود"}
                  className={cn(
                    "border-border rounded-xl border px-3 py-1.5 text-sm",
                    selectedSize === s && ok && "bg-primary text-primary-foreground border-primary",
                    !ok && "cursor-not-allowed opacity-35 line-through decoration-muted-foreground/50",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="border-border h-9 w-9 rounded-lg border"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-sm">{qty}</span>
          <button
            type="button"
            className="border-border h-9 w-9 rounded-lg border"
            onClick={() =>
              setQty((q) => Math.min(outOfStock ? 1 : Math.max(stock, 1), q + 1))
            }
          >
            +
          </button>
        </div>
        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
          {price != null && hasDiscount ? (
            <Price amount={originalPrice!} weight="sm" strike className="text-muted-foreground" />
          ) : null}
          {price != null ? (
            <span className="text-sm font-semibold">
              <Price amount={Number(price)} weight="pdp" />
            </span>
          ) : null}
          <span
            className={cn(
              "text-xs",
              outOfStock ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {outOfStock ? "ناموجود" : `موجودی: ${stock.toLocaleString("fa-IR")}`}
          </span>
        </div>
      </div>

      {outOfStock ? (
        <div className="space-y-2">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="موبایل برای خبر (اگر وارد نیستید)"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
            dir="ltr"
          />
          <button
            type="button"
            disabled={alertLoading || alertDone}
            onClick={() => {
              void (async () => {
                if (weights.length > 0 && !selectedSize) {
                  toast.error("وزن را انتخاب کنید");
                  return;
                }
                if (!match?.id) {
                  toast.error("این ترکیب را انتخاب کنید");
                  return;
                }
                setAlertLoading(true);
                try {
                  const res = await subscribeStockAlertAction({
                    variantId: match.id,
                    productId,
                    phone: guestPhone.trim() || undefined,
                  });
                  if (!res.ok) {
                    const map: Record<string, string> = {
                      auth_or_phone_required: "وارد شوید یا موبایل وارد کنید",
                      invalid_phone: "شماره موبایل معتبر نیست",
                      already_in_stock: "الان موجود است — صفحه را تازه کنید",
                      variant_not_found: "واریانت یافت نشد",
                    };
                    toast.error(map[res.error ?? ""] ?? "ثبت نشد");
                    return;
                  }
                  setAlertDone(true);
                  toast.success(
                    res.already
                      ? "قبلاً در لیست انتظار هستید"
                      : "ثبت شد؛ موجود شد خبرتان می‌کنیم",
                  );
                } catch {
                  toast.error("خطا در ثبت");
                } finally {
                  setAlertLoading(false);
                }
              })();
            }}
            className={cn(
              "border-primary text-primary w-full rounded-xl border py-3 text-sm font-medium hover:bg-primary/5",
              (alertLoading || alertDone) && "opacity-60",
            )}
          >
            {alertDone
              ? "در لیست انتظار هستید"
              : alertLoading
                ? "…"
                : "موجود شد خبرم کن"}
          </button>
        </div>
      ) : (
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleAdd()}
            className={cn(
              "bg-primary text-primary-foreground min-w-0 flex-1 rounded-xl py-3 text-sm font-medium hover:bg-primary/90",
              loading && "opacity-60",
            )}
          >
            {loading ? "…" : "افزودن به سبد"}
          </button>
          <ProductWishCompareInline
            item={{
              id: productId,
              title,
              image: image ?? undefined,
              href: href,
            }}
          />
        </div>
      )}
    </div>
  );
}
