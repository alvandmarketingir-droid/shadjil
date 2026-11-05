"use server";

import { requirePermission } from "@/lib/admin/require-permission";

export type AttrOption = { id: string; value: string; slug?: string; hex?: string | null };

export type AttrWithOptions = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  is_filterable: boolean | null;
  options: AttrOption[];
};

export async function adminListAttributesAction() {
  const gate = await requirePermission("admin.products");
  if (!gate.ok)
    return { ok: false as const, error: gate.error, items: [] as AttrWithOptions[] };
  try {
    const { data: attrs, error } = await gate.supabase
      .from("attributes")
      .select("id, name, slug, type, is_filterable, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const rows = attrs ?? [];
    if (!rows.length) return { ok: true as const, items: [] as AttrWithOptions[] };

    const ids = rows.map((a: { id: string }) => a.id);
    const { data: opts, error: oErr } = await gate.supabase
      .from("attribute_options")
      .select("id, attribute_id, value, slug, sort_order, hex")
      .in("attribute_id", ids)
      .order("sort_order", { ascending: true });
    if (oErr) throw oErr;

    const byAttr = new Map<string, AttrOption[]>();
    for (const o of opts ?? []) {
      const list = byAttr.get(o.attribute_id as string) ?? [];
      list.push({
        hex: (o as { hex?: string | null }).hex ?? null,
        id: o.id as string,
        value: String(o.value ?? ""),
        slug: String(o.slug ?? ""),
      });
      byAttr.set(o.attribute_id as string, list);
    }

    const items: AttrWithOptions[] = rows.map(
      (a: {
        id: string;
        name: string;
        slug: string;
        type?: string | null;
        is_filterable?: boolean | null;
      }) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        type: a.type ?? null,
        is_filterable: a.is_filterable ?? null,
        options: byAttr.get(a.id) ?? [],
      }),
    );
    return { ok: true as const, items };
  } catch (e) {
    console.error("[adminListAttributes]", e);
    return { ok: false as const, error: "server", items: [] as AttrWithOptions[] };
  }
}

export async function adminGetProductAttributeValuesAction(productId: string) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok)
    return {
      ok: false as const,
      error: gate.error,
      values: [] as {
        attribute_id: string;
        option_id: string | null;
        value_text: string | null;
      }[],
    };
  try {
    const { data, error } = await gate.supabase
      .from("product_attribute_values")
      .select("attribute_id, option_id, value_text")
      .eq("product_id", productId);
    if (error) throw error;
    return {
      ok: true as const,
      values: (data ?? []) as {
        attribute_id: string;
        option_id: string | null;
        value_text: string | null;
      }[],
    };
  } catch (e) {
    console.error("[adminGetProductAttributeValues]", e);
    return {
      ok: false as const,
      error: "server",
      values: [] as {
        attribute_id: string;
        option_id: string | null;
        value_text: string | null;
      }[],
    };
  }
}

export type AttrValueInput = {
  attribute_id: string;
  option_id?: string | null;
  value_text?: string | null;
};

export async function adminSyncProductAttributesAction(
  productId: string,
  values: AttrValueInput[],
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!productId) return { ok: false as const, error: "product_required" };
  try {
    const { error: delErr } = await gate.supabase
      .from("product_attribute_values")
      .delete()
      .eq("product_id", productId);
    if (delErr) {
      console.error("[adminSyncProductAttributes delete]", delErr);
      return {
        ok: false as const,
        error: "server" as const,
        detail: delErr.message,
      };
    }

    const rows = (values ?? [])
      .filter((v) => v.attribute_id && (v.option_id || (v.value_text || "").trim()))
      .map((v) => ({
        product_id: productId,
        attribute_id: v.attribute_id,
        option_id: v.option_id || null,
        value_text: (v.value_text || "").trim() || null,
      }));

    if (!rows.length) return { ok: true as const, count: 0 };

    // اول همه را بگذار؛ اگر unique روی (product_id, attribute_id) بود → یکی از هر attribute
    let { error } = await gate.supabase
      .from("product_attribute_values")
      .insert(rows);
    if (error) {
      console.warn("[adminSyncProductAttributes bulk]", error.message);
      const uniq = new Map<string, (typeof rows)[0]>();
      for (const r of rows) uniq.set(r.attribute_id, r);
      const fallback = [...uniq.values()];
      const second = await gate.supabase
        .from("product_attribute_values")
        .insert(fallback);
      if (second.error) {
        console.error("[adminSyncProductAttributes fallback]", second.error);
        return {
          ok: false as const,
          error: "server" as const,
          detail: second.error.message,
        };
      }
      return { ok: true as const, count: fallback.length, deduped: true as const };
    }
    return { ok: true as const, count: rows.length };
  } catch (e) {
    console.error("[adminSyncProductAttributes]", e);
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: string }).message || "")
        : e instanceof Error
          ? e.message
          : "";
    return {
      ok: false as const,
      error: "server" as const,
      detail: msg.slice(0, 200) || undefined,
    };
  }
}

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FFa-z0-9\-]+/gi, "")
      .replace(/\-+/g, "-")
      .replace(/^\-|\-$/g, "") || `attr-${Date.now()}`
  );
}

export async function adminCreateAttributeAction(input: {
  name: string;
  slug?: string;
}) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const name = (input.name || "").trim();
  if (!name) return { ok: false as const, error: "name_required" };
  const slug = (input.slug || "").trim() || slugify(name);
  try {
    const { data, error } = await gate.supabase
      .from("attributes")
      .insert({
        name,
        slug,
        type: "select",
        is_filterable: true,
        is_required: false,
        sort_order: 100,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id as string };
  } catch (e) {
    console.error("[adminCreateAttribute]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminCreateAttributeOptionAction(input: {
  attribute_id: string;
  value: string;
  slug?: string;
  hex?: string | null;
}) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const value = (input.value || "").trim();
  if (!value || !input.attribute_id)
    return { ok: false as const, error: "validation" };
  const slug = (input.slug || "").trim() || slugify(value);
  try {
    const { data, error } = await gate.supabase
      .from("attribute_options")
      .insert({
        attribute_id: input.attribute_id,
        value,
        slug,
        sort_order: 0,
        hex: input.hex ? String(input.hex).trim() || null : null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id as string };
  } catch (e) {
    console.error("[adminCreateAttributeOption]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminDeleteAttributeOptionAction(id: string) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase
      .from("attribute_options")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "server" };
  }
}


export async function adminUpdateAttributeOptionAction(input: {
  id: string;
  value?: string;
  hex?: string | null;
}) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!input.id) return { ok: false as const, error: "validation" };
  const patch: Record<string, unknown> = {};
  if (input.value !== undefined) patch.value = String(input.value).trim();
  if (input.hex !== undefined) {
    const h = input.hex == null ? null : String(input.hex).trim();
    patch.hex = h || null;
  }
  if (!Object.keys(patch).length) return { ok: false as const, error: "validation" };
  try {
    const { error } = await gate.supabase
      .from("attribute_options")
      .update(patch as any)
      .eq("id", input.id);
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdateAttributeOption]", e);
    return { ok: false as const, error: "server" };
  }
}
