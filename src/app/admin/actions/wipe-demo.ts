"use server";

import { requireAdmin } from "@/lib/admin/require-admin";

const DEMO_PRODUCT_SLUGS = [
  "classic-blue-dress-shirt",
  "black-slim-fit-dress-shirt",
  "cream-oxford-casual-shirt",
  "navy-silk-tie",
  "matte-black-bow-tie",
  "silver-round-cufflinks",
  "white-slim-fit-dress-shirt",
] as const;

const DEMO_BLOG_SLUGS = [
  "how-to-choose-shirt-size",
  "dress-vs-casual-shirt",
] as const;

/**
 * Admin-only wipe of known demo catalog + blog rows.
 * Does not touch profiles, shipping, or schema.
 */
export async function adminWipeDemoContentAction() {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const sb = gate.supabase;

  try {
    const { data: products, error: pe } = await sb
      .from("products")
      .select("id")
      .in("slug", [...DEMO_PRODUCT_SLUGS]);
    if (pe) throw pe;
    const productIds = (products || []).map((p) => p.id as string);

    if (productIds.length) {
      const { data: variants } = await sb
        .from("product_variants")
        .select("id")
        .in("product_id", productIds);
      const vids = (variants || []).map((v) => v.id as string);

      if (vids.length) {
        await sb.from("cart_items").delete().in("variant_id", vids);
        await sb.from("order_items").delete().in("variant_id", vids);
        await sb.from("product_variants").delete().in("id", vids);
      }

      for (const table of [
        "product_attribute_values",
        "product_images",
        "product_tag_map",
        "reviews",
        "wishlists",
        "stock_alerts",
      ] as const) {
        const { error } = await sb.from(table).delete().in("product_id", productIds);
        if (error) console.warn(`[wipe-demo] ${table}`, error.message);
      }

      const { error: delP } = await sb.from("products").delete().in("id", productIds);
      if (delP) throw delP;
    }

    const { data: posts } = await sb
      .from("blog_posts")
      .select("id")
      .in("slug", [...DEMO_BLOG_SLUGS]);
    const postIds = (posts || []).map((p) => p.id as string);
    if (postIds.length) {
      await sb.from("blog_tag_map").delete().in("post_id", postIds);
      await sb.from("blog_posts").delete().in("id", postIds);
    }
    await sb.from("blog_categories").delete().eq("slug", "buying-guide");

    return {
      ok: true as const,
      productsRemoved: productIds.length,
      postsRemoved: postIds.length,
    };
  } catch (e) {
    console.error("[adminWipeDemoContentAction]", e);
    return { ok: false as const, error: "server" as const };
  }
}
