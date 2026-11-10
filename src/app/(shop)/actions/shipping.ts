"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getShippingQuote } from "@/lib/shipping/quote";
import type { ShippingMethodRow } from "@/lib/shipping/types";

/**
 * لیست روش‌های فعال ارسال
 * اگر province داده شود، فقط روش‌های مجاز برای آن استان/شهر برمی‌گردد.
 * قانون:
 * - روشی که هیچ ردیفی در shipping_method_zones ندارد → در همه جا فعال است
 * - روشی که به منطقه‌ای لینک شده → فقط اگر استان/شهر مشتری در آن منطقه باشد
 */
export async function listActiveShippingMethodsAction(input?: {
  province?: string;
  city?: string;
}) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("shipping_methods")
      .select(
        "id, title, description, fee, is_active, sort_order, provider_code, pricing_type, api_config",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    // هرگز api_config (کلید/توکن ارائه‌دهنده) را به کلاینت بوضعیت محصولردان
    const all = ((data ?? []) as ShippingMethodRow[]).map((m) => ({
      ...m,
      api_config: null,
    }));

    const province = (input?.province || "").trim();
    const city = (input?.city || "").trim();

    // بدون استان → همه روش‌های فعال
    if (!province) {
      return { ok: true as const, items: all };
    }

    // مناطق منطبق با استان (و در صورت وجود شهر)
    const { data: locations, error: locErr } = await supabase
      .from("shipping_zone_locations")
      .select("zone_id, province, city")
      .eq("province", province);

    if (locErr) throw locErr;

    const matchedZoneIds = new Set<string>();
    for (const loc of locations ?? []) {
      // اگر city در لوکیشن خالی باشد = کل استان
      // اگر city پر باشد فقط همان شهر
      if (!loc.city || !city || loc.city === city) {
        matchedZoneIds.add(loc.zone_id);
      }
    }

    // لینک روش ↔ منطقه
    const { data: links, error: linkErr } = await supabase
      .from("shipping_method_zones")
      .select("method_id, zone_id");

    if (linkErr) throw linkErr;

    const methodsWithZones = new Set<string>();
    const methodsAllowedByZone = new Set<string>();

    for (const link of links ?? []) {
      methodsWithZones.add(link.method_id);
      if (matchedZoneIds.has(link.zone_id)) {
        methodsAllowedByZone.add(link.method_id);
      }
    }

    const filtered = all.filter((m) => {
      // بدون محدودیت منطقه → همه جا
      if (!methodsWithZones.has(m.id)) return true;
      // با محدودیت → فقط اگر منطقه منطبق باشد
      return methodsAllowedByZone.has(m.id);
    });

    return { ok: true as const, items: filtered };
  } catch (e) {
    console.error("[listActiveShippingMethods]", e);
    return { ok: false as const, items: [] as ShippingMethodRow[] };
  }
}

export async function quoteShippingAction(input: {
  methodId: string;
  weightGrams?: number;
  destCity?: string;
  destProvince?: string;
  parcelValueToman?: number;
}) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("shipping_methods")
      .select(
        "id, title, description, fee, is_active, sort_order, provider_code, pricing_type, api_config",
      )
      .eq("id", input.methodId)
      .maybeSingle();

    if (error || !data) {
      return { ok: false as const, error: "method_not_found" };
    }

    const method = data as ShippingMethodRow;
    if (!method.is_active) {
      return { ok: false as const, error: "method_inactive" };
    }

    const quote = await getShippingQuote(method, {
      weightGrams: input.weightGrams ?? 500,
      destCity: input.destCity,
      destProvince: input.destProvince,
      parcelValueToman: input.parcelValueToman,
    });

    // Free shipping rules از site_settings
    if (quote.ok && (input.parcelValueToman ?? 0) > 0) {
      try {
        const { data: settings } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", [
            "free_shipping_enabled",
            "free_shipping_min_amount",
            "free_shipping_exclude_provider_codes",
          ]);

        const map = new Map(
          (settings ?? []).map((s) => [
            s.key,
            typeof s.value === "string" ? s.value : s.value == null ? "" : String(s.value),
          ]),
        );
        const enabled = (map.get("free_shipping_enabled") || "false").toLowerCase() === "true";
        const minAmount = Math.max(0, Number(map.get("free_shipping_min_amount") || 0));
        const exclude = (map.get("free_shipping_exclude_provider_codes") || "")
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean);

        const code = (method.provider_code || "").toLowerCase();
        const excluded =
          exclude.includes(code) ||
          (method.title || "").includes("پیک") ||
          code.includes("peyk");

        if (
          enabled &&
          minAmount > 0 &&
          (input.parcelValueToman ?? 0) >= minAmount &&
          !excluded &&
          method.pricing_type !== "negotiable"
        ) {
          return {
            ok: true as const,
            methodId: method.id,
            title: method.title,
            quote: {
              ok: true as const,
              fee: 0,
              currency: "IRR" as const,
              source: "fixed" as const,
              note: `ارسال رایگان (سفارش بالای ${minAmount.toLocaleString("fa-IR")} تومان)`,
            },
          };
        }
      } catch (settingsErr) {
        console.error("[quoteShipping free_shipping settings]", settingsErr);
      }
    }

    return {
      ok: true as const,
      methodId: method.id,
      title: method.title,
      quote,
    };
  } catch (e) {
    console.error("[quoteShipping]", e);
    return { ok: false as const, error: "server" };
  }
}
