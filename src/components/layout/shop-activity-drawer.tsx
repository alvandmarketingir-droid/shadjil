"use client";

import { Price } from "@/components/ui/price";
import { toast } from "@/lib/toaster";
import { resolveColorHex } from "@/lib/colors";
import { sizeAvailable, sameColor, colorAvailable } from "@/lib/variant-availability";
import Link from "next/link";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useShopStore } from "@/lib/shop-store";
import { useUnifiedCart } from "@/lib/use-unified-cart";
import { useServerCartStore } from "@/lib/server-cart-store";
import { swapCartVariantAction } from "@/app/(shop)/actions/shop";
import { cartRemove, cartSetQty } from "@/lib/cart-api";
import { mapCartError } from "@/lib/cart-errors";
import { X } from "lucide-react";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";

export type ActivityTab = "cart" | "wishlist" | "compare" | "recent" | "notifications";

const LABELS: Record<ActivityTab, string> = {
  cart: "سبد خرید",
  wishlist: "علاقه‌مندی‌ها",
  compare: "مقایسه",
  recent: "بازدیدهای اخیر",
  notifications: "اعلان‌ها",
};

export function ShopActivityDrawer({
  open,
  tab,
  onOpenChange,
}: {
  open: boolean;
  tab: ActivityTab;
  onOpenChange: (open: boolean) => void;
  onTabChange?: (tab: ActivityTab) => void;
}) {
  const _cart = useShopStore((s) => s.cart);
  const { lines: unifiedLines, total: unifiedTotal, isLoggedIn } = useUnifiedCart();
  const _setQuantityOptimistic = useServerCartStore((s) => s.setQuantityOptimistic);
  const _removeOptimistic = useServerCartStore((s) => s.removeOptimistic);
  const _refreshServer = useServerCartStore((s) => s.refresh);
  const wishlist = useShopStore((s) => s.wishlist);
  const compare = useShopStore((s) => s.compare);
  const recent = useShopStore((s) => s.recentlyViewed);
  const _removeFromCart = useShopStore((s) => s.removeFromCart);
  const updateCartItem = useShopStore((s) => s.updateCartItem);
  const _setCartQuantity = useShopStore((s) => s.setCartQuantity);
  const toggleWishlist = useShopStore((s) => s.toggleWishlist);
  const toggleCompare = useShopStore((s) => s.toggleCompare);

  const cartTotal = unifiedTotal;

  const items =
    tab === "notifications"
      ? []
      : tab === "cart"
        ? unifiedLines
        : tab === "wishlist"
          ? wishlist
          : tab === "compare"
            ? compare
            : recent;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md fixed inset-y-0 right-0 left-auto mt-0 flex h-full w-full max-w-md flex-col rounded-none border-l bg-background" dir="rtl">
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border/40 px-2">
          <DrawerTitle>{LABELS[tab]}</DrawerTitle>
          <DrawerClose className="hover:bg-primary hover:text-primary-foreground rounded-full p-2">
            <X className="h-4 w-4" />
          </DrawerClose>
        </DrawerHeader>
<div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "notifications" ? (
            <NotificationsPanel onNavigate={() => onOpenChange(false)} />
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">موردی نیست.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((p) => (
                <div
                  key={(p as { key?: string }).key ?? `${(p as { id?: string; productId?: string }).id ?? (p as { productId?: string }).productId}|${p.roast ?? ""}|${p.weight ?? ""}`}
                  className="flex gap-3 rounded-xl border border-border/60 bg-background p-3"
                >
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-md object-cover aspect-square"
                      style={{ aspectRatio: "1 / 1", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-md bg-muted" style={{ aspectRatio: "1 / 1" }} />
                  )}
                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-sm font-medium">
                      {p.title || "محصول"}
                    </p>
                    {tab === "cart" && typeof p.price === "number" ? (
                      <div className="mt-0.5 space-y-0.5 text-xs">
                        <p className="text-muted-foreground">
                          <Price amount={p.price} weight="sm" />
                          {(p.quantity ?? 1) > 1
                            ? " × " + (p.quantity ?? 1)
                            : ""}
                        </p>
                        <p className="font-medium text-foreground">
                          جمع:{" "}
                          {(
                            p.price * (p.quantity ?? 1)
                          ).toLocaleString("fa-IR")}{" "}
                          تومان
                        </p>
                      </div>
                    ) : null}
                    {tab === "cart" && (
                      <div className="mt-2 space-y-2">
                        {(() => {
                          const line = p as {
                            roasts?: string[];
                            weights?: string[];
                            roastHex?: string;
                            roast?: string;
                            weight?: string;
                            variantId?: string;
                            productId?: string;
                            id?: string;
                            quantity?: number;
                            source?: string;
                            variantOptions?: {
                              roast?: string;
                              roastHex?: string;
                              weight?: string;
                              stock: number;
                            }[];
                          };
                          const opts = line.variantOptions ?? [];
                          const likes = opts.map((o, i) => ({
                            id: String(i),
                            weight: o.weight || null,
                            roast: o.roastHex || o.roast || null,
                            stock: o.stock,
                          }));
                          const roasts: string[] = [];
                          for (const o of opts) {
                            const k = (o.roastHex || o.roast || "").trim();
                            if (
                              k &&
                              !roasts.some(
                                (x) =>
                                  x.replace(/^#/, "").toLowerCase() ===
                                  k.replace(/^#/, "").toLowerCase(),
                              )
                            ) {
                              roasts.push(k);
                            }
                          }
                          if (!roasts.length && (line.roastHex || line.roast)) {
                            roasts.push(line.roastHex || line.roast!);
                          }
                          const weights = [
                            ...new Set(
                              opts
                                .map((o) => (o.weight || "").trim())
                                .filter(Boolean),
                            ),
                          ];
                          if (!weights.length && line.weight) weights.push(line.weight);
                          const currentColor = line.roastHex || line.roast || null;
                          const currentSize = line.weight || null;

                          async function swap(patch: {
                            weight?: string;
                            roastKey?: string;
                          }) {
                            const nextColor =
                              patch.roastKey !== undefined
                                ? patch.roastKey
                                : currentColor;
                            const nextSize =
                              patch.weight !== undefined
                                ? patch.weight
                                : currentSize;
                            if (
                              isLoggedIn &&
                              line.variantId &&
                              (line.productId || line.id)
                            ) {
                              const res = await swapCartVariantAction({
                                oldVariantId: line.variantId,
                                productId: line.productId || line.id!,
                                roastHex: nextColor,
                                weight: nextSize,
                                quantity: line.quantity ?? 1,
                              });
                              if (!res.ok) {
                                toast.error(
                                  res.error === "variant_not_found"
                                    ? "این ترکیب تعریف نشده"
                                    : "تغییر ممکن نشد",
                                );
                                return;
                              }
                              window.dispatchEvent(new Event("pm:cart-changed"));
                              toast.success("سبد به‌روز شد");
                            } else {
                              const pid = line.productId || line.id;
                              if (!pid) return;
                              const key = `${pid}|${p.roast ?? ""}|${p.weight ?? ""}`;
                              updateCartItem(key, {
                                weight: nextSize || undefined,
                                roast: nextColor || undefined,
                              });
                            }
                          }

                          if (!roasts.length && !weights.length) return null;

                          return (
                            <div className="mt-1.5 space-y-1.5">
                              {roasts.length > 0 ? (
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  {roasts.map((c) => {
                                    const hex = resolveColorHex(c) || c;
                                    const active = sameColor(c, currentColor);
                                    const ok = colorAvailable(
                                      c,
                                      likes,
                                      currentSize,
                                    );
                                    return (
                                      <button
                                        key={c}
                                        type="button"
                                        disabled={!ok}
                                        title={
                                          ok
                                            ? c
                                            : "این وضعیت محصول با وزن فعلی تعریف نشده"
                                        }
                                        onClick={() =>
                                          ok && void swap({ roastKey: c })
                                        }
                                        className={`h-5 w-5 rounded-full border-2 ${
                                          active
                                            ? "border-primary ring-1 ring-primary/40"
                                            : "border-black/15"
                                        } ${!ok ? "cursor-not-allowed opacity-30" : ""}`}
                                        style={{ backgroundColor: hex || c }}
                                      />
                                    );
                                  })}
                                </div>
                              ) : null}
                              {weights.length > 0 ? (
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  {weights.map((sz) => {
                                    const active =
                                      (sz || "").toUpperCase() ===
                                      (currentSize || "").toUpperCase();
                                    const ok = sizeAvailable(
                                      sz,
                                      likes,
                                      currentColor,
                                    );
                                    return (
                                      <button
                                        key={sz}
                                        type="button"
                                        disabled={!ok}
                                        title={
                                          ok
                                            ? sz
                                            : `وزن ${sz} برای این وضعیت محصول تعریف نشده`
                                        }
                                        onClick={() =>
                                          ok && void swap({ weight: sz })
                                        }
                                        className={`h-7 min-w-[1.75rem] rounded-md border px-1.5 text-[11px] font-medium ${
                                          active && ok
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-muted/40"
                                        } ${
                                          !ok
                                            ? "cursor-not-allowed opacity-35 line-through decoration-muted-foreground/60"
                                            : ""
                                        }`}
                                      >
                                        {sz}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="text-destructive text-xs"
                            onClick={() => {
                              const vid = (p as { variantId?: string }).variantId;
                              if (!vid) { toast.error("حذف ممکن نشد"); return; }
                              void cartRemove(vid).then((r) => {
                                if (!r.ok) toast.error(mapCartError(r.error));
                                else toast.success("از سبد حذف شد");
                              });
                            }}
                          >
                            حذف
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="border-border h-7 w-7 rounded-md border text-sm"
                              onClick={() => {
                                const vid = (p as { variantId?: string }).variantId;
                                if (!vid) return;
                                const q = Math.max(0, (p.quantity ?? 1) - 1);
                                void cartSetQty(vid, q).then((r) => {
                                  if (!r.ok) toast.error(mapCartError(r.error));
                                });
                              }}
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm">
                              {p.quantity ?? 1}
                            </span>
                            <button
                              type="button"
                              className="border-border h-7 w-7 rounded-md border text-sm"
                              onClick={() => {
                                const vid = (p as { variantId?: string }).variantId;
                                if (!vid) return;
                                const q = Math.min(99, (p.quantity ?? 1) + 1);
                                void cartSetQty(vid, q).then((r) => {
                                  if (!r.ok) toast.error(mapCartError(r.error));
                                });
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {tab === "wishlist" && (
                      <button
                        type="button"
                        className="text-destructive mt-1 text-xs"
                        onClick={() => toggleWishlist(p as any)}
                      >
                        حذف
                      </button>
                    )}
                    {tab === "compare" && (
                      <button
                        type="button"
                        className="text-destructive mt-1 text-xs"
                        onClick={() => toggleCompare(p as any)}
                      >
                        حذف از مقایسه
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </ul>
          )}
        </div>

        {tab === "cart" && (unifiedLines.length > 0) ? (
          <div className="border-border flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm font-medium">جمع کل</span>
            <span className="text-sm font-bold">
              <Price amount={cartTotal} weight="md" />
            </span>
          </div>
        ) : null}

        <DrawerFooter className="shrink-0 space-y-2 border-t border-border/40">
          {tab === "cart" && (unifiedLines.length > 0) ? (
            <>
              <Link
                href="/checkout"
                onClick={() => onOpenChange(false)}
                className="bg-primary text-primary-foreground flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold"
              >
                تسویه حساب
              </Link>
              <Link
                href="/cart"
                onClick={() => onOpenChange(false)}
                className="border-border text-foreground hover:bg-muted flex h-10 w-full items-center justify-center rounded-xl border text-sm font-medium"
              >
                صفحه سبد خرید
              </Link>
            </>
          ) : null}
          <Link
            href="/dashboard"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground hover:bg-muted flex h-10 w-full items-center justify-center rounded-xl border text-sm font-medium"
          >
            مشاهده در پنل خریدار
          </Link>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
