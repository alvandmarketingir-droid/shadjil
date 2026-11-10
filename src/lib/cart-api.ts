"use client";

import {
  addToCartAction,
  removeCartItemAction,
  updateCartQuantityAction,
} from "@/app/(shop)/actions/shop";
import { useServerCartStore } from "@/lib/server-cart-store";

export async function cartAdd(input: {
  variantId: string;
  productId: string;
  title: string;
  price: number;
  quantity?: number;
  image?: string;
  weight?: string;
  roast?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const qty = Math.max(1, Number(input.quantity) || 1);
  const store = useServerCartStore.getState();
  store.addOptimistic({
    key: input.variantId,
    productId: input.productId,
    variantId: input.variantId,
    title: input.title,
    price: input.price,
    quantity: qty,
    image: input.image,
    weight: input.weight,
    roast: input.roast,
  });
  try {
    const res = await addToCartAction(input.variantId, qty);
    if (!res.ok) {
      await store.refresh({ force: true });
      return { ok: false, error: res.error };
    }
    window.setTimeout(() => {
      void useServerCartStore.getState().refresh({ force: true });
    }, 400);
    window.dispatchEvent(new Event("pm:cart-changed"));
    return { ok: true };
  } catch (e) {
    console.error("[cartAdd]", e);
    await store.refresh({ force: true });
    return { ok: false, error: "server" };
  }
}

export async function cartSetQty(
  variantId: string,
  quantity: number,
): Promise<{ ok: boolean; error?: string }> {
  const store = useServerCartStore.getState();
  const q = Math.max(0, Math.floor(Number(quantity) || 0));
  if (q < 1) return cartRemove(variantId);
  store.setQuantityOptimistic(variantId, q);
  try {
    const res = await updateCartQuantityAction(variantId, q);
    if (!res.ok) {
      await store.refresh({ force: true });
      return { ok: false, error: res.error };
    }
    window.dispatchEvent(new Event("pm:cart-changed"));
    return { ok: true };
  } catch (e) {
    console.error("[cartSetQty]", e);
    await store.refresh({ force: true });
    return { ok: false, error: "server" };
  }
}

export async function cartRemove(
  variantId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!variantId) return { ok: false, error: "missing_variant" };
  const store = useServerCartStore.getState();
  store.removeOptimistic(variantId);
  try {
    const res = await removeCartItemAction(variantId);
    if (!res.ok) {
      await store.refresh({ force: true });
      return { ok: false, error: res.error };
    }
    window.dispatchEvent(new Event("pm:cart-changed"));
    return { ok: true };
  } catch (e) {
    console.error("[cartRemove]", e);
    await store.refresh({ force: true });
    return { ok: false, error: "server" };
  }
}
