"use server";

import { requirePermission } from "@/lib/admin/require-permission";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function listShippingZonesAdminAction() {
  const gate = await requirePermission("admin.shipping");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const supabase = createServiceClient();
  const { data: zones, error } = await supabase
    .from("shipping_zones")
    .select("id, name, description, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (error) return { ok: false as const, error: "db" as const };

  const { data: locations } = await supabase
    .from("shipping_zone_locations")
    .select("id, zone_id, province, city");

  const { data: methods } = await supabase
    .from("shipping_methods")
    .select("id, title, provider_code, is_active")
    .order("sort_order", { ascending: true });

  const { data: links } = await supabase
    .from("shipping_method_zones")
    .select("method_id, zone_id");

  return {
    ok: true as const,
    zones: zones ?? [],
    locations: locations ?? [],
    methods: methods ?? [],
    links: links ?? [],
  };
}

export async function saveMethodZonesAction(methodId: string, zoneIds: string[]) {
  const gate = await requirePermission("admin.shipping");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!methodId) return { ok: false as const, error: "missing" as const };

  const supabase = createServiceClient();
  const { error: delErr } = await supabase
    .from("shipping_method_zones")
    .delete()
    .eq("method_id", methodId);
  if (delErr) return { ok: false as const, error: "db" as const };

  const unique = [...new Set(zoneIds.filter(Boolean))];
  if (unique.length) {
    const { error: insErr } = await supabase.from("shipping_method_zones").insert(
      unique.map((zone_id) => ({ method_id: methodId, zone_id })),
    );
    if (insErr) return { ok: false as const, error: "db" as const };
  }

  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
  return { ok: true as const };
}

export async function createShippingZoneAction(input: {
  name: string;
  description?: string;
}) {
  const gate = await requirePermission("admin.shipping");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const name = (input.name || "").trim();
  if (!name) return { ok: false as const, error: "missing" as const };

  const supabase = createServiceClient();
  const { error } = await supabase.from("shipping_zones").insert({
    name,
    description: (input.description || "").trim() || null,
    is_active: true,
  });
  if (error) {
    console.error("[createShippingZone]", error);
    return { ok: false as const, error: "db" as const };
  }
  revalidatePath("/admin/shipping");
  return { ok: true as const };
}

export async function addZoneProvinceAction(zoneId: string, province: string) {
  const gate = await requirePermission("admin.shipping");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const p = (province || "").trim();
  if (!zoneId || !p) return { ok: false as const, error: "missing" as const };

  const supabase = createServiceClient();
  const { error } = await supabase.from("shipping_zone_locations").insert({
    zone_id: zoneId,
    province: p,
    city: null,
  });
  if (error) {
    // unique conflict = already exists
    if (String(error.code) === "23505") return { ok: true as const };
    console.error("[addZoneProvince]", error);
    return { ok: false as const, error: "db" as const };
  }
  revalidatePath("/admin/shipping");
  return { ok: true as const };
}

export async function removeZoneLocationAction(locationId: string) {
  const gate = await requirePermission("admin.shipping");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!locationId) return { ok: false as const, error: "missing" as const };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("shipping_zone_locations")
    .delete()
    .eq("id", locationId);
  if (error) return { ok: false as const, error: "db" as const };
  revalidatePath("/admin/shipping");
  return { ok: true as const };
}

export async function deleteShippingZoneAction(zoneId: string) {
  const gate = await requirePermission("admin.shipping");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!zoneId) return { ok: false as const, error: "missing" as const };

  const supabase = createServiceClient();
  // locations + method links cascade via FK
  const { error } = await supabase.from("shipping_zones").delete().eq("id", zoneId);
  if (error) return { ok: false as const, error: "db" as const };
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
  return { ok: true as const };
}

/**
 * مدل ساده: برای هر روش ارسال، لیست استان‌های مجاز را یکجا ذخیره می‌کند.
 * - اگر provinces خالی باشد → بدون محدودیت (کل ایران)
 * - در غیر این صورت یک منطقه اختصاصی برای همان روش ساخته/به‌روز می‌شود
 */
export async function saveMethodProvincesAction(
  methodId: string,
  provinces: string[],
) {
  const gate = await requirePermission("admin.shipping");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!methodId) return { ok: false as const, error: "missing" as const };

  const unique = [
    ...new Set(
      (provinces || [])
        .map((p) => (p || "").trim())
        .filter(Boolean),
    ),
  ];

  const supabase = createServiceClient();

  // روش را بخوان
  const { data: method, error: mErr } = await supabase
    .from("shipping_methods")
    .select("id, title")
    .eq("id", methodId)
    .maybeSingle();
  if (mErr || !method) return { ok: false as const, error: "not_found" as const };

  // منطقه اختصاصی این روش (نام ثابت بر اساس id)
  const zoneName = `__method_coverage__${methodId}`;
  let zoneId: string | null = null;

  const { data: existingZone } = await supabase
    .from("shipping_zones")
    .select("id")
    .eq("name", zoneName)
    .maybeSingle();

  if (existingZone?.id) {
    zoneId = existingZone.id as string;
  } else {
    const { data: created, error: cErr } = await supabase
      .from("shipping_zones")
      .insert({
        name: zoneName,
        description: `پوشش استان‌های روش: ${method.title}`,
        is_active: true,
        sort_order: 999,
      })
      .select("id")
      .single();
    if (cErr || !created) {
      console.error("[saveMethodProvinces] create zone", cErr);
      return { ok: false as const, error: "db" as const };
    }
    zoneId = created.id as string;
  }

  // پاک کردن لوکیشن‌های قبلی این منطقه
  await supabase.from("shipping_zone_locations").delete().eq("zone_id", zoneId);

  // لینک روش ↔ منطقه را ریست کن
  await supabase.from("shipping_method_zones").delete().eq("method_id", methodId);

  if (unique.length === 0) {
    // بدون محدودیت جغرافیایی
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    return { ok: true as const, mode: "nationwide" as const };
  }

  // استان‌های انتخاب‌شده
  const { error: locErr } = await supabase.from("shipping_zone_locations").insert(
    unique.map((province) => ({
      zone_id: zoneId,
      province,
      city: null,
    })),
  );
  if (locErr) {
    console.error("[saveMethodProvinces] locations", locErr);
    return { ok: false as const, error: "db" as const };
  }

  const { error: linkErr } = await supabase.from("shipping_method_zones").insert({
    method_id: methodId,
    zone_id: zoneId,
  });
  if (linkErr) {
    console.error("[saveMethodProvinces] link", linkErr);
    return { ok: false as const, error: "db" as const };
  }

  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
  return { ok: true as const, mode: "restricted" as const, count: unique.length };
}
