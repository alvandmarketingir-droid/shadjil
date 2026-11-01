import { BaseRepository } from "./base.repository";

export type CreateOrderInput = {
  userId: string | null;
  items: {
    variantId: string;
    productId: string;
    title: string;
    sizeName?: string;
    colorName?: string;
    unitPrice: number;
    quantity: number;
  }[];
  sessionId?: string | null;
  shipping: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    postal?: string;
  };
  shippingFee?: number;
  shippingMethodId?: string | null;
  shippingMethodTitle?: string | null;
  note?: string;
  discountCode?: string | null;
  discountAmount?: number;
  paymentMethod?: "cod" | "online";
};

export class OrderRepository extends BaseRepository {
  async createFromCart(input: CreateOrderInput): Promise<string> {
    const supabase = await this.getClient();
    // کسر موجودی باید از RLS مشتری رد شود → service role
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();

    // 1) موجودی: اگر رزرو active کاربر هست → consume؛ وگرنه decrement اتمی
    await service.rpc("release_expired_stock_reservations");
    let activeRes: { id: string; variant_id: string; quantity: number }[] = [];
    if (input.userId) {
      const { data } = await service
        .from("stock_reservations")
        .select("id, variant_id, quantity")
        .eq("user_id", input.userId)
        .eq("status", "active");
      activeRes = (data as typeof activeRes) ?? [];
    } else if (input.sessionId) {
      const { data } = await service
        .from("stock_reservations")
        .select("id, variant_id, quantity")
        .eq("session_id", input.sessionId)
        .eq("status", "active");
      activeRes = (data as typeof activeRes) ?? [];
    }

    const resByVariant = new Map<string, number>();
    for (const r of activeRes ?? []) {
      const vid = r.variant_id as string;
      resByVariant.set(vid, (resByVariant.get(vid) ?? 0) + Number(r.quantity));
    }

    const reserved: { variantId: string; quantity: number }[] = [];
    for (const item of input.items) {
      const qty = Number(item.quantity);
      if (!item.variantId || qty < 1) {
        throw new Error("invalid_item");
      }
      const held = resByVariant.get(item.variantId) ?? 0;
      if (held >= qty) {
        // قبلاً در checkout کسر شده
        resByVariant.set(item.variantId, held - qty);
        reserved.push({ variantId: item.variantId, quantity: qty });
        continue;
      }
      const need = qty - held;
      if (held > 0) {
        resByVariant.set(item.variantId, 0);
        reserved.push({ variantId: item.variantId, quantity: held });
      }
      const { data: ok, error: dErr } = await service.rpc("decrement_variant_stock", {
        p_variant_id: item.variantId,
        p_qty: need,
      });
      if (dErr) throw dErr;
      if (!ok) {
        for (const r of reserved) {
          try {
            await service.rpc("increment_variant_stock", {
              p_variant_id: r.variantId,
              p_qty: r.quantity,
            });
          } catch (re) {
            console.error("[createFromCart] reserve rollback", r.variantId, re);
          }
        }
        throw new Error(`insufficient_stock:${item.title || item.variantId}`);
      }
      reserved.push({ variantId: item.variantId, quantity: need });
    }

    // رزروهای active کاربر را consumed کن (موجودی برنمی‌گردد)
    if (input.userId) {
      try {
        await service.rpc("consume_user_reservations", { p_user_id: input.userId });
      } catch (ce) {
        console.error("[createFromCart] consume reservations", ce);
      }
    } else if (input.sessionId) {
      try {
        await service.rpc("consume_session_reservations", {
          p_session_id: input.sessionId,
        });
      } catch (ce) {
        console.error("[createFromCart] consume session reservations", ce);
      }
    }

        const itemsTotal = input.items.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0
    );
    const shipFee = Math.max(0, Math.floor(Number(input.shippingFee) || 0));
    const discount = Math.max(0, Math.floor(Number(input.discountAmount) || 0));
    const grandTotal = Math.max(0, itemsTotal - Math.min(discount, itemsTotal) + shipFee);

    const payStatus = input.paymentMethod === "cod" ? "cod" : "pending";
    const { data: order, error: oErr } = await service
      .from("orders")
      .insert({
        user_id: input.userId,
        status: "pending",
        payment_status: payStatus,
        total_amount: grandTotal,
        discount_code: input.discountCode ?? null,
        discount_amount: discount,
        shipping_fee: shipFee,
        shipping_method_id: input.shippingMethodId ?? null,
        shipping_method_title: input.shippingMethodTitle ?? null,
        shipping_name: input.shipping.name,
        shipping_phone: input.shipping.phone,
        shipping_address: input.shipping.address,
        shipping_city: input.shipping.city ?? null,
        shipping_postal: input.shipping.postal ?? null,
        note: input.note ?? null,
      })
      .select("id")
      .single();

    if (oErr) {
      // best-effort rollback stock
      for (const item of input.items) {
        try {
          const { data: v } = await service
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", item.variantId)
            .maybeSingle();
          if (v) {
            await service.rpc("increment_variant_stock", {
              p_variant_id: item.variantId,
              p_qty: Number(item.quantity),
            });
          }
        } catch (re) {
          console.error("[createFromCart] stock rollback", item.variantId, re);
        }
      }
      throw oErr;
    }

    const rows = input.items.map((i) => ({
      order_id: order.id,
      variant_id: i.variantId,
      product_id: i.productId,
      title: i.title,
      size_name: i.sizeName ?? null,
      color_name: i.colorName ?? null,
      unit_price: i.unitPrice,
      quantity: i.quantity,
      line_total: i.unitPrice * i.quantity,
    }));

    const { error: iErr } = await supabase.from("order_items").insert(rows);
    if (iErr) {
      for (const item of input.items) {
        try {
          const { data: v } = await service
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", item.variantId)
            .maybeSingle();
          if (v) {
            await service.rpc("increment_variant_stock", {
              p_variant_id: item.variantId,
              p_qty: Number(item.quantity),
            });
          }
        } catch (re) {
          console.error("[createFromCart] stock rollback items", item.variantId, re);
        }
      }
      throw iErr;
    }

    return order.id;
  }

  async listByUser(userId: string) {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        status,
        payment_status,
        total_amount,
        discount_code,
        discount_amount,
        shipping_fee,
        shipping_method_title,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        tracking_number,
        shipped_at,
        created_at,
        order_items(id, title, size_name, color_name, unit_price, quantity, line_total)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async getById(orderId: string, userId: string) {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        status,
        total_amount,
        discount_code,
        discount_amount,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_postal,
        tracking_number,
        shipped_at,
        note,
        created_at,
        order_items(id, title, size_name, color_name, unit_price, quantity, line_total, variant_id)
      `
      )
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async trackPublic(code: string) {
    // فقط UUID کامل — بدون پیشوند/fallback (ضد IDOR)
    // service role: مهمان هم بتواند وضعیت را ببیند؛ فیلدها حداقل
    const raw = (code || "").trim().toLowerCase();
    const q = raw.replace(/[^0-9a-f-]/g, "");
    const compact = q.replace(/-/g, "");
    if (compact.length !== 32) return null;

    let id = q;
    if (!q.includes("-") && compact.length === 32) {
      id = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
    }

    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    const { data, error } = await service
      .from("orders")
      .select(
        "id, status, payment_status, total_amount, shipping_city, tracking_number, shipped_at, created_at, order_items(id, title, size_name, color_name, quantity, line_total)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[trackPublic]", error);
      throw error;
    }
    return data;
  }


  async listAll(
    limit = 50,
    opts?: { status?: string; q?: string },
  ) {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    let q = supabase
      .from("orders")
      .select(
        `
        id,
        status,
        payment_status,
        total_amount,
        discount_code,
        discount_amount,
        shipping_fee,
        shipping_method_id,
        shipping_method_title,
        shipping_name,
        shipping_phone,
        shipping_city,
        shipping_address,
        tracking_number,
        shipped_at,
        note,
        created_at,
        order_items(id, title, quantity, line_total)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (opts?.status && opts.status !== "all") {
      q = q.eq("status", opts.status);
    }
    if (opts?.q && opts.q.trim()) {
      const term = opts.q.trim();
      // جستجوی ساده روی نام/تلفن (ilike)
      q = q.or(
        `shipping_name.ilike.%${term}%,shipping_phone.ilike.%${term}%`,
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async updateStatus(orderId: string, status: string) {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    const allowed = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) throw new Error("bad_status");

    // restore stock once when moving into cancelled from a non-cancelled state
    if (status === "cancelled") {
      const { data: prev, error: pErr } = await supabase
        .from("orders")
        .select("id, status, order_items(variant_id, quantity)")
        .eq("id", orderId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (prev && prev.status !== "cancelled") {
        const items = (prev as {
          order_items?: { variant_id: string | null; quantity: number }[];
        }).order_items ?? [];
        for (const it of items) {
          if (!it.variant_id) continue;
          const q = Number(it.quantity) || 0;
          if (q < 1) continue;
          try {
            await supabase.rpc("increment_variant_stock", {
              p_variant_id: it.variant_id,
              p_qty: q,
            });
          } catch (re) {
            console.error("[updateStatus] stock restore", it.variant_id, re);
          }
        }
      }
    }

    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "paid") {
      patch.payment_status = "paid";
    } else if (status === "cancelled") {
      patch.payment_status = "failed";
    } else if (status === "shipped") {
      patch.shipped_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", orderId);
    if (error) throw error;
    return true;
  }


  async getByIdAdmin(orderId: string) {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        user_id,
        status,
        total_amount,
        discount_code,
        discount_amount,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_postal,
        note,
        created_at,
        order_items(id, title, size_name, color_name, unit_price, quantity, line_total, variant_id)
      `
      )
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

}
