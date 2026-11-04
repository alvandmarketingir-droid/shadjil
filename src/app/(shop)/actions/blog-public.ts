"use server";

import { createPublicClient } from "@/lib/supabase/public";

/** Published blog reads — anon client, no cookies() (keeps /blog ISR-friendly). */
export async function listPublishedPostsAction(limit = 20) {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, cover_url, published_at, category:blog_categories(name, slug)",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[listPublishedPosts]", e);
    return { ok: false as const, items: [] };
  }
}

export async function getPublishedPostBySlugAction(slug: string) {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, body, cover_url, published_at, meta_title, meta_description, og_title, og_description, og_image_url, robots_index, robots_follow, canonical_url, category:blog_categories(name, slug)",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false as const, post: null, error: "not_found" };
    // cast: generated DB types may lag behind real columns (robots_*, og_*)
    return { ok: true as const, post: data as unknown as Record<string, unknown> };
  } catch (e) {
    console.error("[getPublishedPost]", e);
    return { ok: false as const, post: null, error: "server" };
  }
}
