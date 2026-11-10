"use client";

import { create } from "zustand";
import { getCartAction } from "@/app/(shop)/actions/shop";

export type ServerCartLine = {
  key: string;
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  weight?: string;
  roast?: string;
  roastHex?: string;
  roasts?: string[];
  weights?: string[];
  variantOptions?: {
    roast?: string;
    roastHex?: string;
    weight?: string;
    stock: number;
  }[];
  slug?: string;
};

type ServerCartState = {
  lines: ServerCartLine[];
  loading: boolean;
  hydrated: boolean;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  setLines: (lines: ServerCartLine[]) => void;
  addOptimistic: (line: ServerCartLine) => void;
  setQuantityOptimistic: (variantId: string, quantity: number) => void;
  removeOptimistic: (variantId: string) => void;
  clear: () => void;
  touchMutation: () => void;
};

function mapItems(
  items: NonNullable<Awaited<ReturnType<typeof getCartAction>>["items"]>,
): ServerCartLine[] {
  return (items ?? []).map((l) => ({
    key: l.variantId || l.itemId,
    productId: l.productId,
    variantId: l.variantId,
    title: l.title,
    price: l.price,
    quantity: l.quantity,
    image: l.image,
    weight: l.weight,
    roast: l.roast,
    roastHex: (l as { roastHex?: string }).roastHex,
    roasts: (l as { roasts?: string[] }).roasts,
    weights: (l as { weights?: string[] }).weights,
    variantOptions: (l as { variantOptions?: unknown })
      .variantOptions as ServerCartLine["variantOptions"],
    slug: l.slug,
  }));
}

let inflight: Promise<void> | null = null;
let lastMutationAt = 0;
const MUTATION_GUARD_MS = 1200;

export const useServerCartStore = create<ServerCartState>((set, get) => ({
  lines: [],
  loading: false,
  hydrated: false,
  setLines: (lines) => set({ lines, hydrated: true }),
  clear: () => set({ lines: [], hydrated: true }),

  touchMutation: () => {
    lastMutationAt = Date.now();
  },

  addOptimistic: (line) => {
    lastMutationAt = Date.now();
    const vid = line.variantId;
    const prev = get().lines;
    if (vid && prev.some((l) => l.variantId === vid)) {
      set({
        lines: prev.map((l) =>
          l.variantId === vid
            ? { ...l, quantity: (l.quantity || 1) + (line.quantity || 1) }
            : l,
        ),
        hydrated: true,
      });
      return;
    }
    set({ lines: [line, ...prev], hydrated: true });
  },

  setQuantityOptimistic: (variantId, quantity) => {
    lastMutationAt = Date.now();
    const q = Math.max(0, Math.floor(Number(quantity) || 0));
    set({
      lines: get()
        .lines.map((l) =>
          l.variantId === variantId ? { ...l, quantity: Math.max(1, q) } : l,
        )
        .filter((l) => !(l.variantId === variantId && q < 1)),
    });
  },

  removeOptimistic: (variantId) => {
    lastMutationAt = Date.now();
    set({ lines: get().lines.filter((l) => l.variantId !== variantId) });
  },

  refresh: async (opts) => {
    const force = Boolean(opts?.force);
    if (inflight) return inflight;
    if (
      !force &&
      get().hydrated &&
      Date.now() - lastMutationAt < MUTATION_GUARD_MS
    ) {
      return;
    }

    const first = !get().hydrated;
    if (first) set({ loading: true });

    inflight = (async () => {
      try {
        const res = await getCartAction();
        if (!force && Date.now() - lastMutationAt < MUTATION_GUARD_MS) {
          return;
        }
        if (res.ok) set({ lines: mapItems(res.items), hydrated: true });
        else set({ lines: [], hydrated: true });
      } catch (e) {
        console.error("[server-cart refresh]", e);
        set({ hydrated: true });
      } finally {
        set({ loading: false });
        inflight = null;
      }
    })();
    return inflight;
  },
}));
