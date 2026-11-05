"use server";

import { requirePermission } from "@/lib/admin/require-permission";

export type SeoPageKey = "shop_plp" | "blog_plp";

export async function adminGetSeoPageAction(page_key: SeoPageKey) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error, row: null };
  try {
    const { data, error } = await gate.supabase
      .from("seo_page_settings")
      .select("*")
      .eq("page_key", page_key)
      .maybeSingle();
    if (error) throw error;
    return { ok: true as const, row: data };
  } catch (e) {
    console.error("[adminGetSeoPage]", e);
    return { ok: false as const, error: "server", row: null };
  }
}

export async function adminUpsertSeoPageAction(
  page_key: SeoPageKey,
  input: {
    title?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    focus_keyphrases?: string[];
    og_title?: string | null;
    og_description?: string | null;
    og_image_url?: string | null;
    robots_index?: boolean;
    robots_follow?: boolean;
    canonical_url?: string | null;
    body_preview?: string | null;
  },
) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const row = {
      page_key,
      title: input.title?.trim() || null,
      meta_title: input.meta_title?.trim() || null,
      meta_description: input.meta_description?.trim() || null,
      focus_keyphrases: Array.isArray(input.focus_keyphrases) ? input.focus_keyphrases : [],
      og_title: input.og_title?.trim() || null,
      og_description: input.og_description?.trim() || null,
      og_image_url: input.og_image_url?.trim() || null,
      robots_index: input.robots_index !== false,
      robots_follow: input.robots_follow !== false,
      canonical_url: input.canonical_url?.trim() || null,
      body_preview: input.body_preview?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await gate.supabase
      .from("seo_page_settings")
      .upsert(row, { onConflict: "page_key" });
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpsertSeoPage]", e);
    return { ok: false as const, error: "server" };
  }
}
