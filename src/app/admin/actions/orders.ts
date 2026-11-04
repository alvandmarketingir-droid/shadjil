"use server";
import { notifyShipped } from "@/lib/sms/transactional";
import { emailShipped } from "@/lib/email/send";

import { adminWriteLogAction } from "@/app/admin/actions/logs";

import { requireAdmin } from "@/lib/admin/require-admin";
import { OrderRepository } from "@/repositories/order.repository";
import { createServiceClient } from "@/lib/supabase/service";
import { PREDEFINED_NOTIFICATIONS } from "@/lib/notifications/templates";
import { writeFinancialAudit } from "@/lib/finance/audit";

const STATUS_TEMPLATE: Record<string, string> = {
  processing: "order_processing",
  shipped: "order_shipped",
  delivered: "order_delivered",
  cancelled: "order_cancelled",
};

export async function adminListOrdersAction(
  limit = 50,
  opts?: { status?: string; q?: string },
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const repo = new OrderRepository();
    const items = await repo.listAll(limit, opts);
    return { ok: true as const, items };
  } catch (e) {
    console.error("[adminListOrders]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminUpdateOrderStatusAction(
  orderId: string,
  status: string,
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const repo = new OrderRepository();
    let fromStatus: string | null = null;
    try {
      const prevOrder = await repo.getByIdAdmin(orderId);
      fromStatus = (prevOrder as { status?: string } | null)?.status ?? null;
    } catch {
      /* ignore */
    }
    await repo.updateStatus(orderId, status);
    try {
      await gate.supabase.from("order_status_history").insert({
        order_id: orderId,
        from_status: fromStatus,
        to_status: status,
        note: "تغییر توسط ادمین",
        actor_type: "admin",
        actor_id: gate.userId,
      });
    } catch (he) {
      console.error("[adminUpdateOrderStatus history]", he);
    }
    void adminWriteLogAction({
      action: "order_status_change",
      entity: "order",
      entity_id: orderId,
      meta: status,
    });

    // اعلان به مشتری (best-effort؛ شکست اعلان وضعیت را برنمی‌گرداند)
    try {
      const order = await repo.getByIdAdmin(orderId);
      const userId = (order as { user_id?: string | null } | null)?.user_id;
      const templateId = STATUS_TEMPLATE[status];
      if (userId && templateId) {
        const tpl = PREDEFINED_NOTIFICATIONS.find((x) => x.id === templateId);
        if (tpl) {
          const service = createServiceClient();
          const shortId = orderId.slice(0, 8);
          await service.from("notifications").insert({
            user_id: userId,
            title: tpl.title,
            body: `${tpl.body} (کد: ${shortId}…)`,
            type: tpl.type,
            link: "/dashboard?tab=orders",
          });
        }
      }
    } catch (ne) {
      console.error("[adminUpdateOrderStatus notify]", ne);
    }

    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdateOrderStatus]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminGetOrderAction(orderId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, order: null };
  try {
    const repo = new OrderRepository();
    const order = await repo.getByIdAdmin(orderId);
    if (!order) return { ok: false as const, error: "not_found", order: null };
    return { ok: true as const, order };
  } catch (e) {
    console.error("[adminGetOrder]", e);
    return { ok: false as const, error: "server", order: null };
  }
}

/** حذف دائمی سفارش‌ها: آیتم‌ها + مرجوعی‌ها، در صورت نیاز بازگردانی موجودی، سپس خود سفارش */
export async function adminHardDeleteOrdersAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, deleted: 0, failed: 0 };
  const list = [...new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean))];
  if (!list.length) return { ok: false as const, error: "empty", deleted: 0, failed: 0 };

  const service = createServiceClient();
  let deleted = 0;
  let failed = 0;
  const details: string[] = [];

  for (const orderId of list) {
    try {
      // وضعیت فعلی + آیتم‌ها برای بازگردانی موجودی
      const { data: prev, error: pErr } = await service
        .from("orders")
        .select("id, status, order_items(variant_id, quantity)")
        .eq("id", orderId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prev) {
        failed += 1;
        details.push(`${orderId.slice(0, 8)}:not_found`);
        continue;
      }

      const status = String((prev as { status?: string }).status || "");
      // اگر لغو نشده، موجودی را برگردان (مثل cancel)
      if (status !== "cancelled") {
        const items =
          (
            prev as {
              order_items?: { variant_id: string | null; quantity: number }[];
            }
          ).order_items ?? [];
        for (const it of items) {
          if (!it.variant_id) continue;
          const q = Number(it.quantity) || 0;
          if (q < 1) continue;
          try {
            await service.rpc("increment_variant_stock", {
              p_variant_id: it.variant_id,
              p_qty: q,
            });
          } catch (re) {
            console.error("[hardDelete order] stock restore", orderId, it.variant_id, re);
          }
        }
      }

      // وابستگی‌ها
      await service.from("return_requests").delete().eq("order_id", orderId);
      await service.from("order_items").delete().eq("order_id", orderId);

      const { error: dErr } = await service.from("orders").delete().eq("id", orderId);
      if (dErr) throw dErr;

      void adminWriteLogAction({
        action: "order_hard_delete",
        entity: "order",
        entity_id: orderId,
        meta: status,
      });
      deleted += 1;
    } catch (e) {
      failed += 1;
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message || "")
          : e instanceof Error
            ? e.message
            : "error";
      console.error("[adminHardDeleteOrders]", orderId, e);
      details.push(`${orderId.slice(0, 8)}:${msg.slice(0, 80)}`);
    }
  }

  return {
    ok: failed === 0,
    deleted,
    failed,
    detail: details.slice(0, 5).join(" | ") || undefined,
  };
}


/** تأیید یا رد پرداخت آنلاین توسط ادمین — مشتری با polling/RT می‌بیند */
export async function adminUpdatePaymentStatusAction(
  orderId: string,
  paymentStatus: "pending" | "paid" | "failed" | "refunded",
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const service = createServiceClient();
    const patch: Record<string, unknown> = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };
    // اگر پرداخت تأیید شد، وضعیت سفارش را هم paid کن (اگر هنوز pending باشد)
    if (paymentStatus === "paid") {
      patch.status = "paid";
    }
    if (paymentStatus === "failed") {
      // فقط payment؛ status را لغو اجباری نمی‌کنیم تا ادمین جدا تصمیم بگیرد
    }
    if (paymentStatus === "refunded") {
      // فقط وضعیت پرداخت؛ سفارش ممکن است delivered/cancelled باشد
    }
    const { error } = await service
      .from("orders")
      .update(patch as any)
      .eq("id", orderId);
    if (error) throw error;

    void adminWriteLogAction({
      action: "payment_status_change",
      entity: "order",
      entity_id: orderId,
      meta: paymentStatus,
    });
    void writeFinancialAudit({
      eventType: "payment_status_change",
      orderId,
      meta: { paymentStatus },
      actorId: gate.userId ?? null,
    });

    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdatePaymentStatus]", e);
    return { ok: false as const, error: "server" };
  }
}

/** ذخیره کد رهگیری؛ در صورت خالی نبودن، status را shipped می‌کند */
export async function adminSetOrderTrackingAction(
  orderId: string,
  trackingNumber: string,
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const code = (trackingNumber || "").trim();
    const service = createServiceClient();
    const patch: Record<string, unknown> = {
      tracking_number: code || null,
      updated_at: new Date().toISOString(),
    };
    if (code) {
      patch.shipped_at = new Date().toISOString();
      // اگر هنوز shipped/delivered نیست، به shipped ببر
      const { data: cur } = await service
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .maybeSingle();
      const st = String((cur as { status?: string } | null)?.status ?? "");
      if (st !== "delivered" && st !== "cancelled") {
        patch.status = "shipped";
      }
    }
    const { error } = await service.from("orders").update(patch as any).eq("id", orderId);
    if (error) throw error;

    void adminWriteLogAction({
      action: "order_tracking_set",
      entity: "order",
      entity_id: orderId,
      meta: code || "cleared",
    });

    // اعلان best-effort
    if (code) {
      const repo = new OrderRepository();
      const order = await repo.getByIdAdmin(orderId);
      try {
        const userId = (order as { user_id?: string | null } | null)?.user_id;
        if (userId) {
          const tpl = PREDEFINED_NOTIFICATIONS.find((x) => x.id === "order_shipped");
          if (tpl) {
            await service.from("notifications").insert({
              user_id: userId,
              title: tpl.title,
              body: `${tpl.body} کد رهگیری: ${code}`,
              type: tpl.type,
              link: "/dashboard?tab=orders",
            });
          }
        }
      } catch (ne) {
        console.error("[adminSetOrderTracking notify]", ne);
      }

      try {
        const phone = String((order as { shipping_phone?: string } | null)?.shipping_phone ?? "");
        const name = String((order as { shipping_name?: string } | null)?.shipping_name ?? "مشتری");
        await notifyShipped({ phone, name, orderId, tracking: code });
      } catch (smsErr) {
        console.warn("[sms shipped]", smsErr);
      }

      try {
        let emailTo = String((order as { shipping_email?: string } | null)?.shipping_email ?? "").trim();
        if (!emailTo) {
          const uid = String((order as { user_id?: string } | null)?.user_id ?? "");
          if (uid) {
            try {
              const { data: u } = await service.auth.admin.getUserById(uid);
              emailTo = String(u?.user?.email ?? "").trim();
            } catch { /* */ }
          }
        }
        if (emailTo) {
          await emailShipped({
            to: emailTo,
            customerName: String((order as { shipping_name?: string } | null)?.shipping_name ?? "مشتری"),
            orderId,
            tracking: code,
          });
        }
      } catch (emErr) {
        console.warn("[email shipped]", emErr);
      }
    }

    return { ok: true as const };
  } catch (e) {
    console.error("[adminSetOrderTracking]", e);
    return { ok: false as const, error: "server" };
  }
}


/** یادداشت سفارش — visibility: customer (قابل‌مشاهده مشتری) یا internal */
export async function adminAddOrderNoteAction(
  orderId: string,
  body: string,
  visibility: "customer" | "internal" = "internal",
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const textBody = (body || "").trim();
  if (!textBody) return { ok: false as const, error: "empty" as const };
  if (textBody.length > 2000) return { ok: false as const, error: "too_long" as const };
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("order_notes")
      .insert({
        order_id: orderId,
        body: textBody,
        visibility,
        actor_type: "admin",
        actor_id: gate.userId ?? null,
      })
      .select("id, order_id, body, visibility, actor_type, created_at")
      .single();
    if (error) throw error;
    void adminWriteLogAction({
      action: "order_note_add",
      entity: "order",
      entity_id: orderId,
      meta: visibility,
    });
    return { ok: true as const, note: data };
  } catch (e) {
    console.error("[adminAddOrderNote]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminListOrderNotesAction(orderId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] as const };
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("order_notes")
      .select("id, body, visibility, actor_type, actor_id, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListOrderNotes]", e);
    return { ok: false as const, error: "server", items: [] as const };
  }
}

export async function adminListFinancialAuditForOrderAction(orderId: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] as const };
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("financial_audit_logs")
      .select("id, event_type, amount, meta, actor_id, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListFinancialAudit]", e);
    return { ok: false as const, error: "server", items: [] as const };
  }
}
