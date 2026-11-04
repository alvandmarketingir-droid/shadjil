"use server";

import { submitIndexNow, blogUrl } from "@/lib/seo/indexnow";

import { requireAdmin } from "@/lib/admin/require-admin";

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FFa-z0-9\-]+/gi, "")
      .replace(/\-+/g, "-")
      .replace(/^\-|\-$/g, "") || `post-${Date.now()}`
  );
}

/* ── categories ── */

export async function adminListBlogCategoriesAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("blog_categories")
      .select("id, name, slug, description, is_active, sort_order, created_at")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListBlogCategories]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminCreateBlogCategoryAction(input: {
  name: string;
  slug?: string;
  description?: string;
}) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const name = (input.name || "").trim();
  if (!name) return { ok: false as const, error: "name_required" };
  const slug = (input.slug || "").trim() || slugify(name);
  try {
    const { data, error } = await gate.supabase
      .from("blog_categories")
      .insert({
        name,
        slug,
        description: input.description?.trim() || null,
        meta_title: (input as any).meta_title?.trim?.() || null,
        meta_description: (input as any).meta_description?.trim?.() || null,
        focus_keyphrases: Array.isArray((input as any).focus_keyphrases) ? (input as any).focus_keyphrases : [],
        robots_index: (input as any).robots_index !== false,
        robots_follow: (input as any).robots_follow !== false,
        canonical_url: (input as any).canonical_url?.trim?.() || null,
})
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id };
  } catch (e) {
    console.error("[adminCreateBlogCategory]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminToggleBlogCategoryAction(
  id: string,
  is_active: boolean,
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase
      .from("blog_categories")
      .update({ is_active })
      .eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "server" };
  }
}

/* ── posts ── */

export async function adminListBlogPostsAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("blog_posts")
      .select(
        "id, title, slug, status, published_at, created_at, category:blog_categories(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListBlogPosts]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminCreateBlogPostAction(input: {
  title: string;
  slug?: string;
  category_id?: string | null;
  excerpt?: string;
  body?: string;
  cover_url?: string;
  status?: "draft" | "published" | "archived";
  tag_ids?: string[];
}) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const title = (input.title || "").trim();
  if (!title) return { ok: false as const, error: "title_required" };
  const slug = (input.slug || "").trim() || slugify(title);
  const status = input.status ?? "draft";
  try {
    const { data: post, error } = await gate.supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        category_id: input.category_id || null,
        author_id: gate.userId,
        excerpt: input.excerpt?.trim() || null,
        body: input.body?.trim() || null,
        cover_url: input.cover_url?.trim() || null,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        meta_title: (input as any).meta_title?.trim?.() || null,
        meta_description: (input as any).meta_description?.trim?.() || null,
        focus_keyphrases: Array.isArray((input as any).focus_keyphrases) ? (input as any).focus_keyphrases : [],
        og_title: (input as any).og_title?.trim?.() || null,
        og_description: (input as any).og_description?.trim?.() || null,
        og_image_url: (input as any).og_image_url?.trim?.() || null,
        twitter_title: (input as any).twitter_title?.trim?.() || null,
        twitter_description: (input as any).twitter_description?.trim?.() || null,
        robots_index: (input as any).robots_index !== false,
        robots_follow: (input as any).robots_follow !== false,
        is_cornerstone: !!(input as any).is_cornerstone,
        canonical_url: (input as any).canonical_url?.trim?.() || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    const tagIds = (input.tag_ids ?? []).filter(Boolean);
    if (tagIds.length && post?.id) {
      const rows = tagIds.map((tag_id) => ({ post_id: post.id, tag_id }));
      const { error: tErr } = await gate.supabase.from("blog_tag_map").insert(rows);
      if (tErr) console.error("[blog_tag_map]", tErr);
    }

    if (status === "published" && slug) void submitIndexNow([blogUrl(slug), "/blog"]);
    return { ok: true as const, id: post.id as string };
  } catch (e) {
    console.error("[adminCreateBlogPost]", e);
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: string }).message)
        : "server";
    return { ok: false as const, error: msg };
  }
}

export async function adminSetBlogPostStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const patch: Record<string, unknown> = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    const { error } = await gate.supabase.from("blog_posts").update(patch as any).eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "server" };
  }
}

export async function adminGetBlogPostAction(id: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, post: null };
  try {
    const { data, error } = await gate.supabase
      .from("blog_posts")
      .select(
        `
        id, title, slug, status, excerpt, body, cover_url,
        category_id, published_at, created_at,
        category:blog_categories(id, name),
        blog_tag_map(tag_id)
      `,
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false as const, error: "not_found", post: null };
    return { ok: true as const, post: data };
  } catch (e) {
    console.error("[adminGetBlogPost]", e);
    return { ok: false as const, error: "server", post: null };
  }
}

export async function adminUpdateBlogPostAction(
  id: string,
  input: {
    title: string;
    slug?: string;
    category_id?: string | null;
    excerpt?: string | null;
    body?: string | null;
    cover_url?: string | null;
    status?: "draft" | "published" | "archived";
    tag_ids?: string[];
  },
) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const title = (input.title || "").trim();
  if (!title) return { ok: false as const, error: "title_required" };
  const slug =
    (input.slug || "").trim() ||
    title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FFa-z0-9\-]+/gi, "")
      .replace(/\-+/g, "-")
      .replace(/^\-|\-$/g, "") ||
    `post-${Date.now()}`;
  const status = input.status ?? "draft";
  try {
    const patch: Record<string, unknown> = {
      title,
      slug,
      category_id: input.category_id || null,
      excerpt: input.excerpt?.trim() || null,
      body: input.body?.trim() || null,
      cover_url: input.cover_url?.trim() || null,
      status,
      meta_title: (input as any).meta_title?.trim?.() || null,
      meta_description: (input as any).meta_description?.trim?.() || null,
      focus_keyphrases: Array.isArray((input as any).focus_keyphrases) ? (input as any).focus_keyphrases : [],
      og_title: (input as any).og_title?.trim?.() || null,
      og_description: (input as any).og_description?.trim?.() || null,
      og_image_url: (input as any).og_image_url?.trim?.() || null,
      twitter_title: (input as any).twitter_title?.trim?.() || null,
      twitter_description: (input as any).twitter_description?.trim?.() || null,
      robots_index: (input as any).robots_index !== false,
      robots_follow: (input as any).robots_follow !== false,
      is_cornerstone: !!(input as any).is_cornerstone,
      canonical_url: (input as any).canonical_url?.trim?.() || null,
    };
    if (status === "published") {
      const { data: existing } = await gate.supabase
        .from("blog_posts")
        .select("published_at")
        .eq("id", id)
        .maybeSingle();
      if (!(existing as { published_at?: string | null } | null)?.published_at) {
        patch.published_at = new Date().toISOString();
      }
    }
    const { error } = await gate.supabase.from("blog_posts").update(patch as any).eq("id", id);
    if (error) throw error;

    if (input.tag_ids) {
      await gate.supabase.from("blog_tag_map").delete().eq("post_id", id);
      const tagIds = input.tag_ids.filter(Boolean);
      if (tagIds.length) {
        const { error: tErr } = await gate.supabase.from("blog_tag_map").insert(
          tagIds.map((tag_id) => ({ post_id: id, tag_id })),
        );
        if (tErr) console.error("[blog_tag_map update]", tErr);
      }
    }
    if (status === "published" && slug) void submitIndexNow([blogUrl(slug), "/blog"]);
    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdateBlogPost]", e);
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: string }).message)
        : "server";
    return { ok: false as const, error: msg };
  }
}


/* ── tags ── */

export async function adminListBlogTagsAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("blog_tags")
      .select("id, name, slug, is_active, created_at")
      .order("name");
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListBlogTags]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminCreateBlogTagAction(input: {
  name: string;
  slug?: string;
}) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const name = (input.name || "").trim();
  if (!name) return { ok: false as const, error: "name_required" };
  const slug = (input.slug || "").trim() || slugify(name);
  try {
    const { data, error } = await gate.supabase
      .from("blog_tags")
      .insert({ name, slug })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true as const, id: data.id };
  } catch (e) {
    console.error("[adminCreateBlogTag]", e);
    return { ok: false as const, error: "server" };
  }
}
