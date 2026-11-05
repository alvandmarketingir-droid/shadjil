"use server";

import { requirePermission } from "@/lib/admin/require-permission";



export async function adminListDiscountsAction(limit = 50) {
  const gate = await requirePermission("admin.discounts");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("discounts")
      .select(
        "id, code, type, value, min_order_amount, max_uses, used_count, starts_at, ends_at, is_active, once_per_user, created_at, max_discount_amount, product_ids, category_ids",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListDiscounts]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminSetDiscountActiveAction(id: string, isActive: boolean) {
  const gate = await requirePermission("admin.discounts");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase
      .from("discounts")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminSetDiscountActive]", e);
    return { ok: false as const, error: "server" };
  }
}

function parseUuidList(raw?: string | null): string[] | null {
  if (!raw || !String(raw).trim()) return null;
  const ids = String(raw)
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  return ids.length ? ids : null;
}

export async function adminCreateDiscountAction(input: {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount?: number | null;
  max_uses?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  once_per_user?: boolean;
  max_discount_amount?: number | null;
  product_ids?: string | null;
  category_ids?: string | null;
}) {
  const gate = await requirePermission("admin.discounts");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const code = (input.code || "").trim().toUpperCase();
  if (!code || code.length < 2) return { ok: false as const, error: "bad_code" };
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return { ok: false as const, error: "bad_value" };
  }
  if (input.type === "percentage" && input.value > 100) {
    return { ok: false as const, error: "bad_percent" };
  }

  try {
    const { data, error } = await gate.supabase
      .from("discounts")
      .insert({
        code,
        type: input.type,
        value: input.value,
        min_order_amount: input.min_order_amount ?? 0,
        max_uses: input.max_uses ?? null,
        used_count: 0,
        starts_at: input.starts_at ?? null,
        ends_at: input.ends_at ?? null,
        is_active: true,
        once_per_user: Boolean(input.once_per_user),
        max_discount_amount: input.max_discount_amount ?? null,
        product_ids: parseUuidList(input.product_ids),
        category_ids: parseUuidList(input.category_ids),
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id as string };
  } catch (e) {
    console.error("[adminCreateDiscount]", e);
    return { ok: false as const, error: "server" };
  }
}
