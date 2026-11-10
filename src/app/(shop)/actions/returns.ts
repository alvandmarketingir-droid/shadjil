"use server";

import {
  RETURN_WINDOW_DAYS,
  isReturnAllowedStatus,
} from "@/lib/business-rules";

import { createClient } from "@/lib/supabase/server";
import { assertNoLinkOrImage } from "@/lib/sanitize-user-text";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function listMyReturnsAction() {
  try {
    const user = await requireUser();
    if (!user) return { ok: false as const, items: [], error: "login_required" };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("return_requests")
      .select("id, order_id, reason, status, admin_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[listMyReturns]", e);
    return { ok: false as const, items: [], error: "server" };
  }
}

export async function createReturnAction(input: {
  orderId: string;
  reason: string;
}) {
  try {
    const user = await requireUser();
    if (!user) return { ok: false as const, error: "login_required" };
    if (!input.orderId?.trim())
      return { ok: false as const, error: "order_required" };

    const reason = assertNoLinkOrImage(input.reason, "دلیل مرجوعی");
    if (!reason.ok) return { ok: false as const, error: reason.error };
    if (!reason.text || reason.text.length < 5)
      return { ok: false as const, error: "reason_short" };

    const supabase = await createClient();

    // سفارش باید مال همین کاربر باشد + وضعیت قابل مرجوعی
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, status, created_at, shipped_at")
      .eq("id", input.orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (oErr) console.error("[createReturn order check]", oErr);
    if (!order) return { ok: false as const, error: "order_not_found" };

    if (!isReturnAllowedStatus(String(order.status || ""))) {
      return { ok: false as const, error: "order_not_eligible" };
    }
    const allowed = new Set(["delivered", "shipped"]); // kept for compat; primary check above
    if (!allowed.has(String(order.status))) {
      return { ok: false as const, error: "order_not_eligible" };
    }

    // مهلت مرجوعی: ۷ روز از زمان ارسال/ایجاد سفارش (استاندارد رایج ایران)
    const baseDate = new Date(
      String(
        (order as { shipped_at?: string | null }).shipped_at ||
          order.created_at ||
          "",
      ),
    );
    if (!Number.isNaN(baseDate.getTime())) {
      const days = (Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days > RETURN_WINDOW_DAYS) {
        return { ok: false as const, error: "return_window_expired" };
      }
    }

    // جلوگیری از درخواست باز تکراری روی همان سفارش
    const { data: existing } = await supabase
      .from("return_requests")
      .select("id, status")
      .eq("order_id", input.orderId)
      .eq("user_id", user.id)
      .in("status", ["pending", "approved", "received"])
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, error: "return_already_open" };
    }

    const { data, error } = await supabase
      .from("return_requests")
      .insert({
        user_id: user.id,
        order_id: input.orderId,
        reason: reason.text,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id as string };
  } catch (e) {
    console.error("[createReturn]", e);
    return { ok: false as const, error: "server" };
  }
}
