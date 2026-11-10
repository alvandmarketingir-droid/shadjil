"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ShopProduct = {
  id: string;
  title: string;
  price: number;
  image?: string;
  brand?: string;
  category?: string;
  roast?: string;
  weight?: string;
  variantId?: string;
  roasts?: string[];
  weights?: string[];
  quantity?: number;
  href?: string;
};

type ShopState = {
  cart: ShopProduct[];
  wishlist: ShopProduct[];
  compare: ShopProduct[];
  recentlyViewed: ShopProduct[];
  addToCart: (p: ShopProduct) => void;
  removeFromCart: (id: string, opts?: { roast?: string; weight?: string }) => void;
  updateCartItem: (key: string, patch: Partial<ShopProduct>) => void;
  setCartQuantity: (key: string, quantity: number) => void;
  toggleWishlist: (p: ShopProduct) => void;
  toggleCompare: (p: ShopProduct) => void;
  addRecentlyViewed: (p: ShopProduct) => void;
  clearCart: () => void;
  counts: () => {
    cart: number;
    wishlist: number;
    compare: number;
    recentlyViewed: number;
  };
};

const MAX_RECENT = 20;
const MAX_COMPARE = 4;

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      cart: [],
      wishlist: [],
      compare: [],
      recentlyViewed: [],

      addToCart: (p) =>
        set((s) => {
          const key = `${p.id}|${p.roast ?? ""}|${p.weight ?? ""}`;
          const existing = s.cart.find(
            (x) => `${x.id}|${x.roast ?? ""}|${x.weight ?? ""}` === key
          );
          if (existing) {
            return {
              cart: s.cart.map((x) =>
                `${x.id}|${x.roast ?? ""}|${x.weight ?? ""}` === key
                  ? { ...x, quantity: (x.quantity ?? 1) + 1 }
                  : x
              ),
            };
          }
          return {
            cart: [{ ...p, quantity: p.quantity ?? 1 }, ...s.cart],
          };
        }),

      removeFromCart: (id, opts) =>
        set((s) => ({
          cart: s.cart.filter((x) => {
            if (x.id !== id) return true;
            // اگر roast/weight داده شد، فقط همان خط
            if (opts && (opts.roast !== undefined || opts.weight !== undefined)) {
              const roastOk = (opts.roast ?? "") === (x.roast ?? "");
              const weightOk = (opts.weight ?? "") === (x.weight ?? "");
              return !(roastOk && weightOk);
            }
            // بدون opts: رفتار قدیمی (کل محصول) — ترجیحاً از UI استفاده نشود
            return false;
          }),
        })),
      cartKey: (p: { id: string; roast?: string; weight?: string }) =>
        `${p.id}|${p.roast ?? ""}|${p.weight ?? ""}`,

      updateCartItem: (key, patch) =>
        set((s) => ({
          cart: s.cart.map((x) =>
            `${x.id}|${x.roast ?? ""}|${x.weight ?? ""}` === key
              ? { ...x, ...patch }
              : x
          ),
        })),

      setCartQuantity: (key, quantity) =>
        set((s) => ({
          cart: s.cart
            .map((x) =>
              `${x.id}|${x.roast ?? ""}|${x.weight ?? ""}` === key
                ? { ...x, quantity: Math.max(1, quantity) }
                : x
            )
            .filter((x) => (x.quantity ?? 1) > 0),
        })),

      toggleWishlist: (p) =>
        set((s) => {
          const exists = s.wishlist.some((x) => x.id === p.id);
          return {
            wishlist: exists
              ? s.wishlist.filter((x) => x.id !== p.id)
              : [p, ...s.wishlist],
          };
        }),

      toggleCompare: (p) =>
        set((s) => {
          const exists = s.compare.some((x) => x.id === p.id);
          if (exists) {
            return { compare: s.compare.filter((x) => x.id !== p.id) };
          }
          if (s.compare.length >= MAX_COMPARE) {
            return { compare: [p, ...s.compare.slice(0, MAX_COMPARE - 1)] };
          }
          return { compare: [p, ...s.compare] };
        }),

      addRecentlyViewed: (p) =>
        set((s) => {
          const rest = s.recentlyViewed.filter((x) => x.id !== p.id);
          return {
            recentlyViewed: [p, ...rest].slice(0, MAX_RECENT),
          };
        }),

      clearCart: () => set({ cart: [] }),

      counts: () => {
        const s = get();
        return {
          cart: s.cart.length,
          wishlist: s.wishlist.length,
          compare: s.compare.length,
          recentlyViewed: s.recentlyViewed.length,
        };
      },
    }),
    { name: "pm-shop-store-v1" }
  )
);
