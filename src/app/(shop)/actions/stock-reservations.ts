"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CartRepository } from "@/repositories/cart.repository";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const TTL_MINUTES = 15;

async function requireUid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** همان cookie سبد مهمان */
async function getSessionId() {
  const jar = await cookies();
  let sid = jar.get("pm_cart_sid")?.value;
  if (!sid) {
    sid = randomUUID();
    jar.set("pm_cart_sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return sid;
}

/**
 * ورود به checkout: موجودی سبد را ۱۵ دقیقه رزرو کن
 * لاگین → user_id | مهمان → session_id
 */
export async function reserveCheckoutStockAction() {
  try {
    const userId = await requireUid();
    const sessionId = userId ? null : await getSessionId();
    const service = createServiceClient();
    await service.rpc("release_expired_stock_reservations");

    const cartRepo = new CartRepository();
    const cartId = userId
      ? await cartRepo.getOrCreateCart({ userId, sessionId: null })
      : await cartRepo.getOrCreateCart({ userId: null, sessionId: sessionId! });

    const raw = await cartRepo.listItems(cartId);
    if (!raw.length) {
      if (userId) {
        await service.rpc("release_all_user_reservations", { p_user_id: userId });
      } else if (sessionId) {
        await service.rpc("release_all_session_reservations", {
          p_session_id: sessionId,
        });
      }
      return { ok: false as const, error: "empty_cart" };
    }

    const failed: string[] = [];
    for (const row of raw as any[]) {
      const variantId = row.variant_id as string;
      const qty = Number(row.quantity);
      const title =
        row.product_variants?.products?.name ??
        row.product_variants?.name ??
        variantId;
      if (!variantId || qty < 1) continue;

      let ok = false;
      let error: unknown = null;
      if (userId) {
        const res = await service.rpc("reserve_variant_stock", {
          p_user_id: userId,
          p_variant_id: variantId,
          p_qty: qty,
          p_minutes: TTL_MINUTES,
        });
        ok = Boolean(res.data);
        error = res.error;
      } else {
        const res = await service.rpc("reserve_variant_stock_session", {
          p_session_id: sessionId,
          p_variant_id: variantId,
          p_qty: qty,
          p_minutes: TTL_MINUTES,
        });
        ok = Boolean(res.data);
        error = res.error;
      }
      if (error || !ok) {
        failed.push(String(title));
      }
    }

    if (failed.length) {
      if (userId) {
        await service.rpc("release_all_user_reservations", { p_user_id: userId });
      } else if (sessionId) {
        await service.rpc("release_all_session_reservations", {
          p_session_id: sessionId,
        });
      }
      return {
        ok: false as const,
        error: "insufficient_stock",
        failed,
      };
    }

    const expiresAt = new Date(
      Date.now() + TTL_MINUTES * 60 * 1000,
    ).toISOString();
    return { ok: true as const, expiresAt, minutes: TTL_MINUTES };
  } catch (e) {
    console.error("[reserveCheckoutStock]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function extendCheckoutReservationAction() {
  try {
    const userId = await requireUid();
    const service = createServiceClient();
    await service.rpc("release_expired_stock_reservations");
    if (userId) {
      const { data, error } = await service.rpc("extend_user_reservations", {
        p_user_id: userId,
        p_minutes: TTL_MINUTES,
      });
      if (error) throw error;
      return {
        ok: true as const,
        extended: Number(data ?? 0),
        expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString(),
      };
    }
    const sessionId = await getSessionId();
    const { data, error } = await service.rpc("extend_session_reservations", {
      p_session_id: sessionId,
      p_minutes: TTL_MINUTES,
    });
    if (error) throw error;
    return {
      ok: true as const,
      extended: Number(data ?? 0),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString(),
    };
  } catch (e) {
    console.error("[extendCheckoutReservation]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function releaseCheckoutReservationAction() {
  try {
    const userId = await requireUid();
    const service = createServiceClient();
    if (userId) {
      await service.rpc("release_all_user_reservations", { p_user_id: userId });
      return { ok: true as const };
    }
    const sessionId = await getSessionId();
    await service.rpc("release_all_session_reservations", {
      p_session_id: sessionId,
    });
    return { ok: true as const };
  } catch (e) {
    console.error("[releaseCheckoutReservation]", e);
    return { ok: false as const, error: "server" };
  }
}
