"use server";

import { requirePermission } from "@/lib/admin/require-permission";

/** پیشنهاد لینک داخلی بر اساس کلیدواژه / نام */
export async function adminSuggestInternalLinksAction(input: {
  keyphrase?: string;
  pageName?: string;
  excludeSlug?: string;
  limit?: number;
}) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error, links: [] as { title: string; href: string; type: string }[] };

  const q = (input.keyphrase || input.pageName || "").trim();
  const limit = Math.min(input.limit ?? 8, 15);
  const links: { title: string; href: string; type: string }[] = [];

  try {
    if (q.length >= 2) {
      const { data: products } = await gate.supabase
        .from("products")
        .select("name, slug")
        .eq("status", "published")
        .is("deleted_at", null)
        .ilike("name", `%${q}%`)
        .limit(limit);
      for (const p of products ?? []) {
        if (input.excludeSlug && p.slug === input.excludeSlug) continue;
        links.push({ title: p.name, href: `/products/${p.slug}`, type: "محصول" });
      }

      const { data: posts } = await gate.supabase
        .from("blog_posts")
        .select("title, slug")
        .eq("status", "published")
        .ilike("title", `%${q}%`)
        .limit(5);
      for (const post of posts ?? []) {
        if (input.excludeSlug && post.slug === input.excludeSlug) continue;
        links.push({ title: post.title, href: `/blog/${post.slug}`, type: "مقاله" });
      }

      const { data: cats } = await gate.supabase
        .from("categories")
        .select("name, slug")
        .eq("is_active", true)
        .ilike("name", `%${q}%`)
        .limit(5);
      for (const c of cats ?? []) {
        links.push({ title: c.name, href: `/categories/${c.slug}`, type: "دسته" });
      }
    }
    return { ok: true as const, links: links.slice(0, limit) };
  } catch (e) {
    console.error("[adminSuggestInternalLinks]", e);
    return { ok: false as const, error: "server", links: [] };
  }
}
