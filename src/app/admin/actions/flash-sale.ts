"use server";

import { requirePermission } from "@/lib/admin/require-permission";
import { createClient } from "@/lib/supabase/server";

const KEY_ENDS = "flash_sale_ends_at";

export async function getFlashSaleEndsAtAction() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", KEY_ENDS)
      .maybeSingle();
    if (error) return { ok: true as const, endsAt: null as string | null };
    return { ok: true as const, endsAt: (data?.value as string | null) ?? null };
  } catch {
    return { ok: true as const, endsAt: null as string | null };
  }
}

export async function adminGetFlashSaleSettingsAction() {
  const gate = await requirePermission("admin.discounts");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const { data, error } = await gate.supabase
    .from("site_settings")
    .select("value")
    .eq("key", KEY_ENDS)
    .maybeSingle();

  if (error) {
    return { ok: true as const, endsAt: null as string | null, tableMissing: true };
  }
  return {
    ok: true as const,
    endsAt: (data?.value as string | null) ?? null,
    tableMissing: false,
  };
}

export async function adminSetFlashSaleEndsAtAction(endsAtIso: string | null) {
  const gate = await requirePermission("admin.discounts");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const value =
    endsAtIso && endsAtIso.trim() ? new Date(endsAtIso).toISOString() : null;

  if (value === null) {
    const { error } = await gate.supabase
      .from("site_settings")
      .delete()
      .eq("key", KEY_ENDS);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  }

  const { error } = await gate.supabase.from("site_settings").upsert(
    { key: KEY_ENDS, value, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
