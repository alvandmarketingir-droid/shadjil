"use server";

import { requirePermission } from "@/lib/admin/require-permission";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9\-]+/gi, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "") || `item-${Date.now()}`;
}

/* ── Categories ── */

export async function adminListCategoriesAction() {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("categories")
      .select(
        "id, parent_id, name, slug, description, image_url, sort_order, is_active, created_at",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListCategories]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminCreateCategoryAction(input: {
  name: string;
  slug?: string;
  parent_id?: string | null;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const name = (input.name || "").trim();
  if (!name) return { ok: false as const, error: "name_required" };
  const slug = (input.slug || "").trim() || slugify(name);
  try {
    const { data, error } = await gate.supabase
      .from("categories")
      .insert({
        name,
        slug,
        parent_id: input.parent_id || null,
        description: input.description?.trim() || null,
        image_url: input.image_url?.trim() || null,
        sort_order: Number(input.sort_order ?? 0) || 0,
        is_active: input.is_active !== false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id };
  } catch (e) {
    console.error("[adminCreateCategory]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminUpdateCategoryAction(
  id: string,
  patch: {
    name?: string;
    slug?: string;
    parent_id?: string | null;
    description?: string | null;
    image_url?: string | null;
    sort_order?: number;
    is_active?: boolean;
  },
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase.from("categories").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdateCategory]", e);
    return { ok: false as const, error: "server" };
  }
}

/* ── Brands ── */

export async function adminListBrandsAction() {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("brands")
      .select("id, name, slug, logo_url, description, is_active, created_at")
      .order("name", { ascending: true });
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListBrands]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminCreateBrandAction(input: {
  name: string;
  slug?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
}) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const name = (input.name || "").trim();
  if (!name) return { ok: false as const, error: "name_required" };
  const slug = (input.slug || "").trim() || slugify(name);
  try {
    const { data, error } = await gate.supabase
      .from("brands")
      .insert({
        name,
        slug,
        logo_url: input.logo_url?.trim() || null,
        description: input.description?.trim() || null,
        is_active: input.is_active !== false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id };
  } catch (e) {
    console.error("[adminCreateBrand]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminUpdateBrandAction(
  id: string,
  patch: {
    name?: string;
    slug?: string;
    logo_url?: string | null;
    description?: string | null;
    is_active?: boolean;
  },
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase.from("brands").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdateBrand]", e);
    return { ok: false as const, error: "server" };
  }
}
