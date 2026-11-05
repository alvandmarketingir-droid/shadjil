"use server";

import { requirePermission } from "@/lib/admin/require-permission";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminStockAlertRow = {
  id: string;
  user_id: string | null;
  phone: string | null;
  variant_id: string;
  product_id: string | null;
  status: string;
  created_at: string;
  notified_at: string | null;
  product_name?: string | null;
  size?: string | null;
  color_name?: string | null;
  stock_quantity?: number | null;
};

export async function adminListStockAlertsAction(opts?: {
  status?: "all" | "pending" | "notified" | "cancelled";
  limit?: number;
}) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) {
    return { ok: false as const, error: gate.error, items: [] as AdminStockAlertRow[] };
  }
  try {
    const service = createServiceClient();
    const limit = Math.min(200, Math.max(1, opts?.limit ?? 100));
    let q = service
      .from("stock_alerts")
      .select("id, user_id, phone, variant_id, product_id, status, created_at, notified_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    const st = opts?.status;
    if (st && st !== "all") q = q.eq("status", st);
    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as AdminStockAlertRow[];
    const variantIds = [...new Set(rows.map((r) => r.variant_id).filter(Boolean))];
    if (!variantIds.length) return { ok: true as const, items: rows };

    const { data: variants } = await service
      .from("product_variants")
      .select("id, size, color_name, stock_quantity, product_id, products(name)")
      .in("id", variantIds);

    const map = new Map<string, {
      size?: string | null;
      color_name?: string | null;
      stock_quantity?: number | null;
      product_name?: string | null;
      product_id?: string | null;
    }>();
    for (const v of variants ?? []) {
      const prod = (v as { products?: { name?: string } | null }).products;
      map.set(v.id as string, {
        size: (v as { size?: string | null }).size ?? null,
        color_name: (v as { color_name?: string | null }).color_name ?? null,
        stock_quantity: Number((v as { stock_quantity?: number }).stock_quantity ?? 0),
        product_name: prod?.name ?? null,
        product_id: (v as { product_id?: string }).product_id ?? null,
      });
    }

    const items = rows.map((r) => {
      const m = map.get(r.variant_id);
      return {
        ...r,
        size: m?.size ?? null,
        color_name: m?.color_name ?? null,
        stock_quantity: m?.stock_quantity ?? null,
        product_name: m?.product_name ?? null,
        product_id: r.product_id ?? m?.product_id ?? null,
      };
    });
    return { ok: true as const, items };
  } catch (e) {
    console.error("[adminListStockAlerts]", e);
    return { ok: false as const, error: "server" as const, items: [] as AdminStockAlertRow[] };
  }
}

export async function adminSetStockAlertStatusAction(
  id: string,
  status: "pending" | "notified" | "cancelled",
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!id?.trim()) return { ok: false as const, error: "id_required" };
  try {
    const service = createServiceClient();
    const patch: Record<string, unknown> = { status };
    if (status === "notified") patch.notified_at = new Date().toISOString();
    const { error } = await service.from("stock_alerts").update(patch as any).eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminSetStockAlertStatus]", e);
    return { ok: false as const, error: "server" };
  }
}
