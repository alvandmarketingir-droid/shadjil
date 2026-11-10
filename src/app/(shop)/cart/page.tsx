"use client";

import { cartRemove, cartSetQty } from "@/lib/cart-api";
import { mapCartError } from "@/lib/cart-errors";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveColorHex } from "@/lib/colors";
import {
  sizeAvailable,
  colorAvailable,
  sameColor,
  roastNorm,
} from "@/lib/variant-availability";
import { useShopStore } from "@/lib/shop-store";
import { useServerCartStore } from "@/lib/server-cart-store";
import { useUnifiedCart } from "@/lib/use-unified-cart";
import {
  removeCartItemAction,
  updateCartQuantityAction,
  swapCartVariantAction,
} from "@/app/(shop)/actions/shop";
import { toPersianDigits } from "@/lib/numbers";
import { LumaSpin } from "@/components/ui/luma-spin";
import { EmptyBlock } from "@/components/ui/ui-state-blocks";
import { track } from "@/lib/analytics/track";

export const dynamic = "force-dynamic";

type VOpt = {
  roast?: string;
  roastHex?: string;
  weight?: string;
  stock: number;
};

function fmtPrice(n: number) {
  return toPersianDigits(Math.round(n).toLocaleString("en-US")) + " تومان";
}

function roastsFromOpts(opts: VOpt[]): string[] {
  const out: string[] = [];
  for (const o of opts) {
    const k = (o.roastHex || o.roast || "").trim();
    if (!k) continue;
    if (!out.some((x) => roastNorm(x) === roastNorm(k))) out.push(k);
  }
  return out;
}

function weightsFromOpts(opts: VOpt[]): string[] {
  return [...new Set(opts.map((o) => (o.weight || "").trim()).filter(Boolean))];
}

function toLikes(opts: VOpt[]) {
  return opts.map((o, i) => ({
    id: String(i),
    weight: o.weight || null,
    roast: o.roastHex || o.roast || null,
    stock: Number(o.stock ?? 0),
  }));
}

export default function CartPage() {
  const localCart = useShopStore((s) => s.cart);
  const removeFromCart = useShopStore((s) => s.removeFromCart);
  const setCartQuantity = useShopStore((s) => s.setCartQuantity);
  const updateCartItem = useShopStore((s) => s.updateCartItem);
  const setQuantityOptimistic = useServerCartStore((s) => s.setQuantityOptimistic);
  const removeOptimistic = useServerCartStore((s) => s.removeOptimistic);
  const refreshServer = useServerCartStore((s) => s.refresh);
  const { lines: unifiedLines, total: unifiedTotal, isLoggedIn } =
    useUnifiedCart();
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);
  // صف تعداد: کلیک‌های پشت‌سرهم روی همان خط
  const pendingQty = useRef<Record<string, number>>({});

  const lines = useMemo(() => {
    return unifiedLines.map((l) => ({
      key: l.key,
      productId: l.productId,
      variantId: l.variantId,
      title: l.title || "محصول",
      price: l.price ?? 0,
      quantity: l.quantity ?? 1,
      image: l.image,
      weight: l.weight,
      roast: l.roast,
      roastHex: l.roastHex,
      variantOptions: (l.variantOptions ?? []) as VOpt[],
    }));
  }, [unifiedLines]);

  const total = unifiedTotal;

  useEffect(() => {
    void track({
      event_name: "view_cart",
      value: total,
    });
  }, []);

  function setBusy(key: string, v: boolean) {
    setBusyMap((m) => ({ ...m, [key]: v }));
  }

  async function changeQty(line: (typeof lines)[number], delta: number) {
    const id = line.variantId || line.key;
    const current =
      pendingQty.current[id] ??
      line.quantity ??
      1;
    const next = Math.max(0, Math.min(99, current + delta));
    pendingQty.current[id] = next;

    if (next < 1) {
      delete pendingQty.current[id];
      await removeLine(line);
      return;
    }

    setMsg(null);
    if (!line.variantId) {
      setMsg("تغییر تعداد ممکن نشد");
      return;
    }
    // مهمان و لاگین هر دو از سبد سرور استفاده می‌کنند
    setQuantityOptimistic(line.variantId, next);

    setBusy(line.key, true);
    try {
      const target = pendingQty.current[id] ?? next;
      const res = await cartSetQty(line.variantId, target);
      if (!res.ok) {
        setMsg(mapCartError(res.error));
        void refreshServer({ force: true });
      }
    } catch {
      setMsg("خطا در تغییر تعداد");
      void refreshServer({ force: true });
    } finally {
      setBusy(line.key, false);
      const latest = pendingQty.current[id];
      if (line.variantId && latest != null && latest !== next && latest >= 1) {
        setQuantityOptimistic(line.variantId, latest);
        void cartSetQty(line.variantId, latest).then((r) => {
          if (!r.ok) void refreshServer({ force: true });
        });
      }
    }
  }

  async function removeLine(line: (typeof lines)[number]) {
    setBusy(line.key, true);
    setMsg(null);
    try {
      if (!line.variantId) { setMsg("حذف ممکن نشد"); return; }
      const res = await cartRemove(line.variantId);
      if (!res.ok) setMsg(mapCartError(res.error));
    } finally {
      setBusy(line.key, false);
    }
  }


  async function changeVariant(
    line: (typeof lines)[number],
    patch: { weight?: string; roastKey?: string },
  ) {
    const opts = line.variantOptions;
    const likes = toLikes(opts);
    const nextColor =
      patch.roastKey !== undefined
        ? patch.roastKey
        : line.roastHex || line.roast || null;
    const nextSize =
      patch.weight !== undefined ? patch.weight : line.weight || null;

    if (opts.length) {
      const ok = likes.some((v) => {
        const roastOk =
          !nextColor || !v.roast || sameColor(v.roast, nextColor);
        const weightOk = !nextSize || !v.weight || v.weight === nextSize;
        return roastOk && weightOk && (v.stock ?? 0) > 0;
      });
      if (!ok) {
        setMsg("این ترکیب وضعیت محصول/وزن تعریف نشده یا موجود نیست.");
        return;
      }
    }

    setBusy(line.key, true);
    setMsg(null);
    try {
      if (line.variantId && line.productId) {
        const res = await swapCartVariantAction({
          oldVariantId: line.variantId,
          productId: line.productId,
          roastHex: nextColor,
          weight: nextSize,
          quantity: line.quantity,
        });
        if (!res.ok) {
          setMsg(
            res.error === "variant_not_found"
              ? "این ترکیب تعریف نشده است."
              : res.error?.startsWith("insufficient_stock")
                ? "موجودی کافی نیست."
                : "تغییر ممکن نشد.",
          );
          return;
        }
        window.dispatchEvent(new Event("pm:cart-changed"));
        await refreshServer();
      } else {
        updateCartItem(line.key, {
          weight: nextSize || undefined,
          roast: nextColor || undefined,
        });
      }
    } finally {
      setBusy(line.key, false);
    }
  }

  return (
    <main className="w-full max-w-none mx-auto space-y-6 px-4 py-8 md:py-12" dir="rtl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-iranyekan-heavy text-primary">
            سبد خرید
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            وضعیت محصول، وزن و تعداد — فوری به‌روز می‌شود
          </p>
        </div>
        <Link
          href="/products"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ادامه خرید
        </Link>
      </div>

      {msg ? (
        <p className="text-destructive border-destructive/30 bg-destructive/5 rounded-xl border px-3 py-2 text-sm">
          {msg}
        </p>
      ) : null}

      {lines.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border px-6 py-16 text-center">
          <EmptyBlock
          title="سبد خرید خالی است"
          description="هنوز محصولی به سبد اضافه نکرده‌اید."
        />
          <Link
            href="/products"
            className="bg-primary text-primary-foreground inline-flex h-10 items-center rounded-xl px-5 text-sm font-medium"
          >
            مشاهده محصولات
          </Link>
        </div>
      ) : (
        <>
          <ul className="border-border divide-y rounded-2xl border">
            {lines.map((p) => {
              const qty = Number(p.quantity ?? 1);
              const busy = !!busyMap[p.key];
              const opts = p.variantOptions;
              const likes = toLikes(opts);
              const roasts = roastsFromOpts(opts);
              const weights = weightsFromOpts(opts);
              const currentColor = p.roastHex || p.roast || null;
              const currentSize = p.weight || null;

              return (
                <li key={p.key} className="flex gap-3 p-4">
                  <div className="bg-muted h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2 text-right">
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {fmtPrice(Number(p.price))}
                      {qty > 1 ? ` × ${toPersianDigits(String(qty))}` : ""}
                    </p>
                    <p className="text-xs font-medium">
                      جمع: {fmtPrice(Number(p.price) * qty)}
                    </p>

                    {roasts.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-[11px]">وضعیت محصول</p>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {roasts.map((c) => {
                            const hex = resolveColorHex(c) || c;
                            const active = sameColor(c, currentColor);
                            const ok = colorAvailable(c, likes, currentSize);
                            return (
                              <button
                                key={c}
                                type="button"
                                disabled={busy || !ok}
                                title={ok ? c : "ترکیب تعریف‌نشده"}
                                onClick={() =>
                                  ok && void changeVariant(p, { roastKey: c })
                                }
                                className={`h-7 w-7 rounded-full border-2 ${
                                  active
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-border"
                                } ${!ok ? "cursor-not-allowed opacity-30" : ""}`}
                                style={{ backgroundColor: hex || c }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {weights.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-[11px]">موجودی</p>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {weights.map((sz) => {
                            const active =
                              (sz || "").toUpperCase() ===
                              (currentSize || "").toUpperCase();
                            const ok = sizeAvailable(sz, likes, currentColor);
                            return (
                              <button
                                key={sz}
                                type="button"
                                disabled={busy || !ok}
                                title={ok ? sz : `وزن ${sz} ناموجود`}
                                onClick={() =>
                                  ok && void changeVariant(p, { weight: sz })
                                }
                                className={`h-8 min-w-[2.25rem] rounded-lg border px-2 text-xs font-medium ${
                                  active && ok
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border"
                                } ${
                                  !ok
                                    ? "cursor-not-allowed opacity-35 line-through"
                                    : ""
                                }`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <div className="border-border flex items-center rounded-lg border">
                        <button
                          type="button"
                          className="h-8 w-8"
                          onClick={() => void changeQty(p, -1)}
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm tabular-nums">
                          {toPersianDigits(String(qty))}
                        </span>
                        <button
                          type="button"
                          className="h-8 w-8"
                          onClick={() => void changeQty(p, +1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-destructive text-xs"
                        onClick={() => void removeLine(p)}
                      >
                        حذف
                      </button>
                      {busy ? (
                        <span className="scale-75">
                          <LumaSpin />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
            <div>
              <p className="text-muted-foreground text-xs">جمع کل</p>
              <p className="text-lg font-bold text-primary">{fmtPrice(total)}</p>
            </div>
            <Link
              href="/checkout"
              className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
            >
              تسویه حساب
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
