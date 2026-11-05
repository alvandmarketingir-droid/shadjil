"use server";

import { requirePermission } from "@/lib/admin/require-permission";

export type SeoReportRow = {
  type: string;
  id: string;
  title: string;
  slug: string;
  href: string;
  hasMetaTitle: boolean;
  hasMetaDesc: boolean;
  hasKeyphrase: boolean;
  robotsIndex: boolean;
  scoreHint: number;
};

export type SeoReportSummary = {
  total: number;
  missingTitle: number;
  missingDesc: number;
  missingKeyphrase: number;
  noindex: number;
  avgScore: number;
  rows: SeoReportRow[];
};

function scoreRow(r: {
  hasMetaTitle: boolean;
  hasMetaDesc: boolean;
  hasKeyphrase: boolean;
  robotsIndex: boolean;
}): number {
  let s = 40;
  if (r.hasMetaTitle) s += 20;
  if (r.hasMetaDesc) s += 20;
  if (r.hasKeyphrase) s += 15;
  if (!r.robotsIndex) s = Math.min(s, 50);
  return Math.min(100, s);
}

export async function adminSeoSiteReportAction(): Promise<
  { ok: true; report: SeoReportSummary } | { ok: false; error: string }
> {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false, error: gate.error };

  const rows: SeoReportRow[] = [];

  try {
    const { data: products } = await gate.supabase
      .from("products")
      .select("id, name, slug, meta_title, meta_description, focus_keyphrases, robots_index, status")
      .is("deleted_at", null)
      .limit(500);

    for (const p of products ?? []) {
      const hasMetaTitle = !!(p.meta_title && String(p.meta_title).trim());
      const hasMetaDesc = !!(p.meta_description && String(p.meta_description).trim());
      const hasKeyphrase = Array.isArray(p.focus_keyphrases) && p.focus_keyphrases.length > 0;
      const robotsIndex = p.robots_index !== false;
      const base = { hasMetaTitle, hasMetaDesc, hasKeyphrase, robotsIndex };
      rows.push({
        type: "محصول",
        id: p.id,
        title: p.name,
        slug: p.slug,
        href: `/admin/products/${p.id}/edit`,
        ...base,
        scoreHint: scoreRow(base),
      });
    }

    const { data: posts } = await gate.supabase
      .from("blog_posts")
      .select("id, title, slug, meta_title, meta_description, focus_keyphrases, robots_index")
      .limit(300);

    for (const post of posts ?? []) {
      const hasMetaTitle = !!(post.meta_title && String(post.meta_title).trim());
      const hasMetaDesc = !!(post.meta_description && String(post.meta_description).trim());
      const hasKeyphrase = Array.isArray(post.focus_keyphrases) && post.focus_keyphrases.length > 0;
      const robotsIndex = post.robots_index !== false;
      const base = { hasMetaTitle, hasMetaDesc, hasKeyphrase, robotsIndex };
      rows.push({
        type: "مقاله",
        id: post.id,
        title: post.title,
        slug: post.slug,
        href: `/admin/blog/${post.id}/edit`,
        ...base,
        scoreHint: scoreRow(base),
      });
    }

    const { data: categories } = await gate.supabase
      .from("categories")
      .select("id, name, slug, meta_title, meta_description, focus_keyphrases, robots_index")
      .limit(200);

    for (const c of categories ?? []) {
      const hasMetaTitle = !!(c.meta_title && String(c.meta_title).trim());
      const hasMetaDesc = !!(c.meta_description && String(c.meta_description).trim());
      const hasKeyphrase = Array.isArray(c.focus_keyphrases) && c.focus_keyphrases.length > 0;
      const robotsIndex = c.robots_index !== false;
      const base = { hasMetaTitle, hasMetaDesc, hasKeyphrase, robotsIndex };
      rows.push({
        type: "دسته",
        id: c.id,
        title: c.name,
        slug: c.slug,
        href: `/admin/categories/${c.id}/edit`,
        ...base,
        scoreHint: scoreRow(base),
      });
    }

    const { data: brands } = await gate.supabase
      .from("brands")
      .select("id, name, slug, meta_title, meta_description, focus_keyphrases, robots_index")
      .limit(200);

    for (const b of brands ?? []) {
      const hasMetaTitle = !!(b.meta_title && String(b.meta_title).trim());
      const hasMetaDesc = !!(b.meta_description && String(b.meta_description).trim());
      const hasKeyphrase = Array.isArray(b.focus_keyphrases) && b.focus_keyphrases.length > 0;
      const robotsIndex = b.robots_index !== false;
      const base = { hasMetaTitle, hasMetaDesc, hasKeyphrase, robotsIndex };
      rows.push({
        type: "برند",
        id: b.id,
        title: b.name,
        slug: b.slug,
        href: `/admin/brands/${b.id}/edit`,
        ...base,
        scoreHint: scoreRow(base),
      });
    }

    const total = rows.length || 1;
    const missingTitle = rows.filter((r) => !r.hasMetaTitle).length;
    const missingDesc = rows.filter((r) => !r.hasMetaDesc).length;
    const missingKeyphrase = rows.filter((r) => !r.hasKeyphrase).length;
    const noindex = rows.filter((r) => !r.robotsIndex).length;
    const avgScore = Math.round(rows.reduce((a, r) => a + r.scoreHint, 0) / total);

    rows.sort((a, b) => a.scoreHint - b.scoreHint);

    return {
      ok: true,
      report: {
        total: rows.length,
        missingTitle,
        missingDesc,
        missingKeyphrase,
        noindex,
        avgScore,
        rows: rows.slice(0, 100),
      },
    };
  } catch (e) {
    console.error("[adminSeoSiteReport]", e);
    return { ok: false, error: "server" };
  }
}
