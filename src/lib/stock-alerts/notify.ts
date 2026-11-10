import { createServiceClient } from "@/lib/supabase/service";

export async function notifyStockAlertsForVariant(variantId: string): Promise<{
  notified: number;
}> {
  if (!variantId) return { notified: 0 };
  const service = createServiceClient();

  const { data: variant } = await service
    .from("product_variants")
    .select("id, stock_quantity, product_id, weight, roast_name, products(name, slug)")
    .eq("id", variantId)
    .maybeSingle();

  const stock = Number(variant?.stock_quantity ?? 0);
  if (!variant || stock <= 0) return { notified: 0 };

  const { data: alerts } = await service
    .from("stock_alerts")
    .select("id, user_id, phone")
    .eq("variant_id", variantId)
    .eq("status", "pending")
    .limit(500);

  if (!alerts?.length) return { notified: 0 };

  const prod = variant.products as
    | { name?: string; slug?: string }
    | { name?: string; slug?: string }[]
    | null;
  const p = Array.isArray(prod) ? prod[0] : prod;
  const titleName = p?.name ?? "محصول";
  const slug = p?.slug ?? "";
  const weight = (variant as { weight?: string | null }).weight ?? "";
  const roast = (variant as { roast_name?: string | null }).roast_name ?? "";
  const label = [titleName, roast, weight].filter(Boolean).join(" · ");
  const link = slug ? `/products/${slug}` : "/";

  let n = 0;
  for (const a of alerts) {
    try {
      if (a.user_id) {
        await service.from("notifications").insert({
          user_id: a.user_id,
          title: "موجود شد",
          body: `${label} دوباره موجود شد.`,
          type: "stock",
          link,
        });
      }
      if (a.phone) {
        await service.from("sms_outbox").insert({
          phone: a.phone,
          body: `${label} موجود شد.`,
          status: "queued",
          meta: { variant_id: variantId, alert_id: a.id },
        });
      }
      await service
        .from("stock_alerts")
        .update({
          status: "notified",
          notified_at: new Date().toISOString(),
        })
        .eq("id", a.id)
        .eq("status", "pending");
      n += 1;
    } catch (e) {
      console.error("[notifyStockAlerts row]", e);
    }
  }

  try {
    const { data: admins } = await service
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(20);
    const body = `${label} موجود شد — ${n} نفر از لیست انتظار مطلع شدند.`;
    for (const ad of admins ?? []) {
      await service.from("notifications").insert({
        user_id: ad.id,
        title: "لیست انتظار موجودی",
        body,
        type: "stock_admin",
        link: "/admin/products",
      });
    }
  } catch (e) {
    console.error("[notifyStockAlerts admin]", e);
  }

  return { notified: n };
}
