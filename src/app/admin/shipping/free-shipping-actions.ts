"use server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

const KEYS = {
  enabled: "free_shipping_enabled",
  minAmount: "free_shipping_min_amount",
  exclude: "free_shipping_exclude_provider_codes",
} as const;

export async function getFreeShippingSettingsAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [KEYS.enabled, KEYS.minAmount, KEYS.exclude]);

    if (error) {
      console.error("[getFreeShippingSettings]", error);
      return { ok: false as const, error: "db" as const };
    }

    const map = new Map(
      (data ?? []).map((r: { key: string; value: unknown }) => [r.key, String(r.value ?? "")]),
    );
    return {
      ok: true as const,
      enabled: (map.get(KEYS.enabled) || "false").toLowerCase() === "true",
      minAmount: Math.max(0, Number(map.get(KEYS.minAmount) || 0) || 0),
      excludeCodes: map.get(KEYS.exclude) || "peyk,alopeyk",
    };
  } catch (e) {
    console.error("[getFreeShippingSettings]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function saveFreeShippingSettingsAction(input: {
  enabled: boolean;
  minAmount: number;
  excludeCodes?: string;
}) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const minAmount = Math.max(0, Math.floor(Number(input.minAmount) || 0));
  const excludeCodes = (input.excludeCodes || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .join(",");

  try {
    const supabase = createServiceClient();
    const rows = [
      { key: KEYS.enabled, value: input.enabled ? "true" : "false" },
      { key: KEYS.minAmount, value: String(minAmount) },
      { key: KEYS.exclude, value: excludeCodes || "peyk,alopeyk" },
    ];

    for (const row of rows) {
      const { error } = await supabase.from("site_settings").upsert(row as any, {
        onConflict: "key",
      });
      if (error) {
        console.error("[saveFreeShippingSettings]", error);
        return { ok: false as const, error: "db" as const };
      }
    }

    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    return { ok: true as const };
  } catch (e) {
    console.error("[saveFreeShippingSettings]", e);
    return { ok: false as const, error: "server" as const };
  }
}
