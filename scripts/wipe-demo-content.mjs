#!/usr/bin/env node
/**
 * Wipe demo/test catalog + blog content via Supabase service role.
 * Does NOT drop schema, shipping seeds, or admin/customer profiles.
 *
 * Usage (from repo root, with .env.local):
 *   npm run wipe:demo
 *   DRY_RUN=1 npm run wipe:demo
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dry = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — aborting.",
  );
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_PRODUCT_SLUGS = [
  "classic-blue-dress-shirt",
  "black-slim-fit-dress-shirt",
  "cream-oxford-casual-shirt",
  "navy-silk-tie",
  "matte-black-bow-tie",
  "silver-round-cufflinks",
  "white-slim-fit-dress-shirt",
];

const DEMO_BLOG_SLUGS = [
  "how-to-choose-shirt-size",
  "dress-vs-casual-shirt",
];

const DEMO_BLOG_CATEGORY_SLUGS = ["buying-guide"];

/** Optional: wipe ALL products/brands/blog (shop-ready empty). Set WIPE_ALL=1 */
const wipeAll = process.env.WIPE_ALL === "1" || process.env.WIPE_ALL === "true";

async function del(table, filter) {
  if (dry) {
    console.log(`[dry-run] delete ${table}`, filter || "(all rows matching wipe)");
    return;
  }
  let q = sb.from(table).delete();
  if (filter) q = filter(q);
  // PostgREST requires a filter — use neq id impossible only when intentional all-delete
  const { error, count } = await q.select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`ok ${table}`, count ?? "");
}

async function main() {
  console.log(dry ? "DRY RUN" : "LIVE WIPE", wipeAll ? "(WIPE_ALL)" : "(demo slugs only)");

  // Resolve product ids
  let productIds = [];
  if (wipeAll) {
    const { data, error } = await sb.from("products").select("id");
    if (error) throw error;
    productIds = (data || []).map((r) => r.id);
  } else {
    const { data, error } = await sb
      .from("products")
      .select("id")
      .in("slug", DEMO_PRODUCT_SLUGS);
    if (error) throw error;
    productIds = (data || []).map((r) => r.id);
  }
  console.log("products targeted:", productIds.length);

  // Child tables that reference products (best-effort; ignore missing tables)
  const byProduct = [
    "product_attribute_values",
    "product_images",
    "product_tag_map",
    "product_variants",
    "product_price_history",
    "wishlists",
    "stock_alerts",
    "reviews",
  ];

  for (const table of byProduct) {
    if (!productIds.length) break;
    try {
      if (dry) {
        console.log(`[dry-run] ${table} for ${productIds.length} products`);
        continue;
      }
      const { error } = await sb.from(table).delete().in("product_id", productIds);
      if (error) console.warn(`skip ${table}:`, error.message);
      else console.log(`ok ${table}`);
    } catch (e) {
      console.warn(`skip ${table}:`, e);
    }
  }

  // Cart / order lines referencing variants of these products — clear orphaned cart_items via variant
  if (productIds.length && !dry) {
    const { data: variants } = await sb
      .from("product_variants")
      .select("id")
      .in("product_id", productIds);
    const vids = (variants || []).map((v) => v.id);
    if (vids.length) {
      for (const table of ["cart_items", "order_items"]) {
        const { error } = await sb.from(table).delete().in("variant_id", vids);
        if (error) console.warn(`skip ${table}:`, error.message);
        else console.log(`ok ${table}`);
      }
      const { error } = await sb.from("product_variants").delete().in("id", vids);
      if (error) console.warn("skip product_variants:", error.message);
      else console.log("ok product_variants");
    }
  }

  if (productIds.length && !dry) {
    const { error } = await sb.from("products").delete().in("id", productIds);
    if (error) throw error;
    console.log("ok products");
  }

  // Blog
  if (!dry) {
    if (wipeAll) {
      await sb.from("blog_tag_map").delete().neq("post_id", "00000000-0000-0000-0000-000000000000");
      await sb.from("blog_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await sb.from("blog_tags").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await sb.from("blog_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("ok blog_* (all)");
    } else {
      const { data: posts } = await sb
        .from("blog_posts")
        .select("id")
        .in("slug", DEMO_BLOG_SLUGS);
      const pids = (posts || []).map((p) => p.id);
      if (pids.length) {
        await sb.from("blog_tag_map").delete().in("post_id", pids);
        await sb.from("blog_posts").delete().in("id", pids);
      }
      await sb.from("blog_categories").delete().in("slug", DEMO_BLOG_CATEGORY_SLUGS);
      console.log("ok blog demo");
    }
  } else {
    console.log("[dry-run] blog wipe");
  }

  // Brands: only wipe-all (demo brand set was remote-seeded; avoid deleting real brands by guess)
  if (wipeAll && !dry) {
    const { error } = await sb
      .from("brands")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn("brands:", error.message);
    else console.log("ok brands (all)");
  }

  // Demo page_* CMS blobs from 053 (optional — keep real FAQ/terms if customized)
  if (process.env.WIPE_PAGE_SETTINGS === "1" && !dry) {
    await sb
      .from("site_settings")
      .delete()
      .in("key", [
        "page_faq",
        "page_terms",
        "page_privacy",
        "page_shipping",
        "page_returns",
      ]);
    console.log("ok page_* site_settings");
  }

  console.log("done. Profiles / schema / shipping untouched.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
