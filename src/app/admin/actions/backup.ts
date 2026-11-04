"use server";

import { requireAdmin } from "@/lib/admin/require-admin";

/** ترتیب restore: والد قبل از فرزند */
const RESTORE_ORDER = [
  "categories",
  "brands",
  "attributes",
  "attribute_options",
  "tags",
  "blog_categories",
  "blog_tags",
  "products",
  "product_variants",
  "product_images",
  "product_attribute_values",
  "product_tags",
  "product_price_history",
  "discounts",
  "profiles",
  "orders",
  "order_items",
  "reviews",
  "return_requests",
  "blog_posts",
  "blog_tag_map",
  "site_settings",
] as const;

const EXPORT_TABLES = [...RESTORE_ORDER] as const;

const ROW_LIMIT = 10000;
const BATCH = 200;

type Row = Record<string, unknown>;

async function fetchAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  name: string,
): Promise<{ rows: Row[]; error?: string }> {
  const { data, error } = await supabase.from(name).select("*").limit(ROW_LIMIT);
  if (error) return { rows: [], error: error.message || "error" };
  return { rows: (data as Row[]) ?? [] };
}

export async function adminBackupExportAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const tables: Record<string, Row[]> = {};
  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (const name of EXPORT_TABLES) {
    const { rows, error } = await fetchAll(gate.supabase, name);
    tables[name] = rows;
    counts[name] = rows.length;
    if (error) errors[name] = error;
  }

  return {
    ok: true as const,
    version: 1,
    exportedAt: new Date().toISOString(),
    rowLimit: ROW_LIMIT,
    counts,
    errors,
    tables,
  };
}

export async function adminBackupRestoreAction(payload: {
  confirm: string;
  version?: number;
  tables: Record<string, Row[]>;
}) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  if ((payload.confirm || "").trim() !== "RESTORE") {
    return { ok: false as const, error: "confirm_required" as const };
  }
  if (!payload.tables || typeof payload.tables !== "object") {
    return { ok: false as const, error: "invalid_payload" as const };
  }

  const results: Record<string, { upserted: number; error?: string }> = {};

  for (const name of RESTORE_ORDER) {
    const rows = payload.tables[name];
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      results[name] = { upserted: 0 };
      continue;
    }

    let upserted = 0;
    let lastErr: string | undefined;

    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error } = await (gate.supabase.from(name) as any).upsert(chunk, {
        onConflict: "id",
        ignoreDuplicates: false,
      });
      if (error) {
        lastErr = error.message || "upsert_failed";
        // ادامهٔ جداول دیگر
        break;
      }
      upserted += chunk.length;
    }

    results[name] = lastErr
      ? { upserted, error: lastErr }
      : { upserted };
  }

  return {
    ok: true as const,
    restoredAt: new Date().toISOString(),
    results,
  };
}
