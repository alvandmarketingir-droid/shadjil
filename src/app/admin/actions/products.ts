"use server";

import { revalidatePath } from "next/cache";
import { submitIndexNow, productUrl } from "@/lib/seo/indexnow";

import { recordProductPrice } from "@/lib/price-history";

import { adminWriteLogAction } from "@/app/admin/actions/logs";

import { requirePermission } from "@/lib/admin/require-permission";
import { normalizeProductSlug } from "@/lib/product-slug";
import { productPathFromSlug, upsertUrlRedirect } from "@/lib/seo/redirects";

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FFa-z0-9\-]+/gi, "")
      .replace(/\-+/g, "-")
      .replace(/^\-|\-$/g, "") || `product-${Date.now()}`
  );
}


async function linkVariantImages(
  supabase: any,
  productId: string,
  variants: {
    id?: string | null;
    weight?: string | null;
    roast_name?: string | null;
    image_url?: string | null;
  }[],
) {
  const { data: allVars, error: listErr } = await supabase
    .from("product_variants")
    .select("id, weight, roast_name")
    .eq("product_id", productId);
  if (listErr) {
    console.error("[linkVariantImages list]", listErr);
    return;
  }
  const rows = (allVars ?? []) as {
    id: string;
    weight: string | null;
    roast_name: string | null;
  }[];

  for (const vv of variants) {
    const url = (vv.image_url || "").trim();
    if (!url) continue;

    let vid: string | null = (vv.id || "").trim() || null;
    if (!vid) {
      const weight = (vv.weight || "").trim() || null;
      const roast = (vv.roast_name || "").trim() || null;
      const match = rows.find(
        (r) => (r.weight || null) === weight && (r.roast_name || null) === roast,
      );
      vid = match?.id ?? null;
    }
    if (!vid) {
      console.warn("[linkVariantImages] no variant", vv.weight, vv.roast_name, vv.id);
      continue;
    }

    const { data: existing, error: exErr } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .eq("variant_id", vid)
      .limit(1);
    if (exErr) {
      console.error("[linkVariantImages existing]", exErr);
      continue;
    }

    if (existing?.[0]?.id) {
      const { error } = await supabase
        .from("product_images")
        .update({ url, is_primary: false })
        .eq("id", existing[0].id);
      if (error) console.error("[linkVariantImages update]", error);
    } else {
      const { error } = await supabase.from("product_images").insert({
        product_id: productId,
        variant_id: vid,
        url,
        is_primary: false,
        sort_order: 10,
      });
      if (error) console.error("[linkVariantImages insert]", error);
    }
  }
}




export async function adminListProductsAction(
  limit = 100,
  opts?: { q?: string; status?: string },
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    let query = gate.supabase
      .from("products")
      .select(
        "id, name, slug, status, is_featured, is_new, is_bestseller, created_at, updated_at, published_at, category_id, brand_id, deleted_at, category:categories(id, name), brand:brands(id, name), product_images(id, url, is_primary, sort_order)",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(200, Math.max(1, Number(limit) || 100)));

    const status = (opts?.status || "").trim();
    if (status === "archived") {
      // فقط بایگانی
      query = query.or("status.eq.archived,deleted_at.not.is.null");
    } else if (status && ["draft", "published"].includes(status)) {
      query = query.eq("status", status as "draft" | "published").is("deleted_at", null);
    }
    // else: همه وضعیت‌ها — پیش‌نویس + منتشر + بایگانی
    const q = (opts?.q || "").trim();
    if (q) {
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as any[];
    const items = rows.map((row) => {
      const imgs = Array.isArray(row.product_images) ? row.product_images : [];
      const sorted = [...imgs].sort(
        (a: any, b: any) =>
          Number(b.is_primary) - Number(a.is_primary) ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      const thumb = sorted[0]?.url ?? null;
      const { product_images: _pi, ...rest } = row;
      return { ...rest, thumb_url: thumb };
    });
    return { ok: true as const, items };
  } catch (e) {
    console.error("[adminListProducts]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminSetProductFlagsAction(
  id: string,
  patch: Partial<{
    status: "draft" | "published" | "archived";
    is_featured: boolean;
    is_new: boolean;
    is_bestseller: boolean;
  }>,
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const body: Record<string, unknown> = { ...patch };
    // همگام‌سازی deleted_at با وضعیت
    if (patch.status === "archived") {
      body.deleted_at = new Date().toISOString();
      body.status = "archived";
    } else if (patch.status === "draft" || patch.status === "published") {
      body.deleted_at = null;
      body.status = patch.status;
    }
    const { error } = await gate.supabase.from("products").update(body as any).eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "server" };
  }
}

export async function adminListCategoriesAction() {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("categories")
      .select("id, name, slug, is_active")
      .order("name");
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch {
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminListBrandsAction() {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    const { data, error } = await gate.supabase
      .from("brands")
      .select("id, name, slug, is_active")
      .order("name");
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch {
    return { ok: false as const, error: "server", items: [] };
  }
}

type CreateProductInput = {
  name: string;
  slug?: string;
  category_id: string;
  brand_id?: string | null;
  short_description?: string;
  description?: string;
  status?: "draft" | "published" | "archived";
  is_featured?: boolean;
  is_new?: boolean;
  is_bestseller?: boolean;
  price?: number;
  original_price?: number | null;
  stock_quantity?: number;
  weight?: string;
  roast_name?: string;
  roast_hex?: string;
  sku?: string;
  tag_ids?: string[];
  image_url?: string;
  image_alt?: string;
  variants?: AdminVariantInput[];
  weight_guide_id?: string | null;
  published_at?: string | null;

  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyphrases?: string[];
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  robots_index?: boolean;
  robots_follow?: boolean;
  is_cornerstone?: boolean;
  canonical_url?: string | null;
};


export type AdminVariantInput = {
  id?: string;
  weight?: string | null;
  roast_name?: string | null;
  roast_hex?: string | null;
  sku?: string | null;
  price: number;
  original_price?: number | null;
  stock_quantity?: number;
  is_active?: boolean;
  image_url?: string | null;
};


async function revalidateProductPaths(
  supabase: { from: (t: string) => any },
  productId: string,
) {
  try {
    const { data } = await supabase
      .from("products")
      .select("slug")
      .eq("id", productId)
      .maybeSingle();
    const slug = (data?.slug || "").trim();
    if (slug) {
      revalidatePath(`/products/${slug}`);
      void submitIndexNow([productUrl(slug), "/products", "/"]);
    } else {
      revalidatePath("/");
      revalidatePath("/products");
    }
  } catch (e) {
    console.warn("[revalidateProductPaths]", e);
  }
}

export async function adminCreateProductAction(input: CreateProductInput) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const name = (input.name || "").trim();
  if (!name) return { ok: false as const, error: "name_required" };
  if (!input.category_id) return { ok: false as const, error: "category_required" };
  const price = input.price == null || input.price === ("" as never) ? 0 : Number(input.price);
  if (!Number.isFinite(price) || price < 0)
    return { ok: false as const, error: "price_invalid" };

  const slug = normalizeProductSlug((input.slug || "").trim() || slugify(name));

  try {
    const { data: product, error: pErr } = await gate.supabase
      .from("products")
      .insert({
        name,
        slug,
        category_id: input.category_id,
        brand_id: input.brand_id || null,
        short_description: input.short_description?.trim() || null,
        description: input.description?.trim() || null,
        status: input.status ?? "draft",
        is_featured: !!input.is_featured,
        is_new: !!input.is_new,
        is_bestseller: !!input.is_bestseller,
        weight_guide_id: input.weight_guide_id || null,
        published_at: input.published_at || null,

        meta_title: input.meta_title?.trim() || null,
        meta_description: input.meta_description?.trim() || null,
        focus_keyphrases: Array.isArray(input.focus_keyphrases) ? input.focus_keyphrases : [],
        og_title: input.og_title?.trim() || null,
        og_description: input.og_description?.trim() || null,
        og_image_url: input.og_image_url?.trim() || null,
        twitter_title: input.twitter_title?.trim() || null,
        twitter_description: input.twitter_description?.trim() || null,
        robots_index: input.robots_index !== false,
        robots_follow: input.robots_follow !== false,
        is_cornerstone: !!input.is_cornerstone,
        canonical_url: input.canonical_url?.trim() || null,
      })
      .select("id")
      .single();
    if (pErr) throw pErr;

    const variantList =
      input.variants && input.variants.length
        ? input.variants
        : [
            {
              sku: input.sku,
              weight: input.weight,
              roast_name: input.roast_name,
              roast_hex: input.roast_hex,
              price,
              original_price: input.original_price,
              stock_quantity: input.stock_quantity,
            },
          ];

    
    const seenSkuCreate = new Set<string>();
    for (const vv of variantList) {
      const vp = Number(vv.price ?? price);
      if (!Number.isFinite(vp) || vp < 0) continue;
      let skuVal = (vv.sku || "").trim() || null;
      if (skuVal) {
        if (seenSkuCreate.has(skuVal)) skuVal = null;
        else seenSkuCreate.add(skuVal);
      }
      const { error: vErr } = await gate.supabase.from("product_variants").insert({
        product_id: product.id,
        sku: skuVal,
        weight: (vv.weight || "").trim() || null,
        roast_name: (vv.roast_name || "").trim() || null,
        roast_hex: (vv.roast_hex || "").trim() || null,
        price: vp,
        original_price:
          vv.original_price != null && Number.isFinite(Number(vv.original_price))
            ? Number(vv.original_price)
            : null,
        stock_quantity: Math.max(0, Number(vv.stock_quantity ?? 0) || 0),
        is_active: true,
      });
      if (vErr) throw vErr;
    }

    if (input.variants?.length) {
      try {
        await linkVariantImages(gate.supabase, product.id, input.variants);
      } catch (e) {
        console.error("[linkVariantImages create]", e);
      }
    }

    const tagIds = (input.tag_ids ?? []).filter(Boolean);
    if (tagIds.length) {
      const rows = tagIds.map((tag_id) => ({
        product_id: product.id,
        tag_id,
      }));
      const { error: tErr } = await gate.supabase.from("product_tag_map").insert(rows);
      if (tErr) console.error("[product_tag_map]", tErr);
    }

    const imageUrl = (input.image_url || "").trim();
    if (imageUrl) {
      const { error: imgErr } = await gate.supabase.from("product_images").insert({
        product_id: product.id,
        url: imageUrl,
        alt_text: (input.image_alt || name).trim() || null,
        is_primary: true,
        sort_order: 0,
      });
      if (imgErr) console.error("[product_images]", imgErr);
    }

    await revalidateProductPaths(gate.supabase, product.id as string);
    return { ok: true as const, id: product.id as string, data: { id: product.id as string } };
  } catch (e) {
    console.error("[adminCreateProduct]", e);
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: string }).message || "")
        : e instanceof Error
          ? e.message
          : "";
    return { ok: false as const, error: "server" as const, detail: msg.slice(0, 200) || undefined };
  }
}


export async function adminGetProductAction(id: string) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    // بدون image_url روی واریانت (ستون وجود ندارد) — لود جدا برای راهنما/زمان‌بندی
    const { data, error } = await gate.supabase
      .from("products")
      .select(
        `
        id, name, slug, category_id, brand_id,
        short_description, description, status,
        is_featured, is_new, is_bestseller,
        product_variants ( id, sku, price, original_price, stock_quantity, weight, roast_name, roast_hex, is_active ),
        product_images ( id, url, alt_text, is_primary, sort_order, variant_id ),
        product_tag_map ( tag_id )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[adminGetProduct]", error);
      return {
        ok: false as const,
        error: "server" as const,
        detail: error.message,
      };
    }
    if (!data) return { ok: false as const, error: "not_found" };

    // فیلدهای اختیاری migration (اگر ستون نباشد نادیده)
    let weight_guide_id: string | null = null;
    let published_at: string | null = null;
    try {
      const { data: extra } = await gate.supabase
        .from("products")
        .select("weight_guide_id, published_at, meta_title, meta_description, focus_keyphrases, og_title, og_description, og_image_url, twitter_title, twitter_description, robots_index, robots_follow, is_cornerstone, canonical_url")
        .eq("id", id)
        .maybeSingle();
      if (extra) {
        weight_guide_id = (extra as { weight_guide_id?: string | null }).weight_guide_id ?? null;
        published_at = (extra as { published_at?: string | null }).published_at ?? null;
        Object.assign(data as object, extra);
      }
    } catch (e) {
      console.warn("[adminGetProduct extra cols]", e);
    }

    const tag_ids = ((data as { product_tag_map?: { tag_id: string }[] }).product_tag_map ?? []).map(
      (x) => x.tag_id,
    );
    const images = (
      (data as { product_images?: { id: string; url: string; is_primary?: boolean; variant_id?: string | null }[] }).product_images ?? []
    ).map((im) => ({ id: im.id, url: im.url, is_primary: im.is_primary, variant_id: im.variant_id ?? null }));
    const primary = images.find((i) => i.is_primary) ?? images[0];
    const variants = ((data as { product_variants?: unknown[] }).product_variants ?? []).map((v) => {
      const row = v as Record<string, unknown>;
      return { ...row, image_url: null };
    });
    const shaped = {
      ...data,
      weight_guide_id,
      published_at,
      tag_ids,
      images,
      image_url: primary?.url ?? null,
      variants,
    };
    return { ok: true as const, product: shaped, data: shaped };
  } catch (e) {
    console.error("[adminGetProduct]", e);
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: string }).message || "")
        : e instanceof Error
          ? e.message
          : "";
    return { ok: false as const, error: "server" as const, detail: msg.slice(0, 200) || undefined };
  }
}

export async function adminUpdateProductAction(
  id: string,
  input: {
    name?: string;
    slug?: string;
    category_id?: string | null;
    brand_id?: string | null;
    short_description?: string | null;
    description?: string | null;
    status?: string;
    is_featured?: boolean;
    is_new?: boolean;
    is_bestseller?: boolean;
    is_active?: boolean;
    sku?: string | null;
    price?: number;
    original_price?: number | null;
    stock_quantity?: number;
    weight?: string | null;
    roast_name?: string | null;
    roast_hex?: string | null;
    image_url?: string | null;
    image_alt?: string | null;
    tag_ids?: string[];
    weight_guide_id?: string | null;
    published_at?: string | null;

  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyphrases?: string[];
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  robots_index?: boolean;
  robots_follow?: boolean;
  is_cornerstone?: boolean;
  canonical_url?: string | null;
  },
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    // partial: فقط فیلدهای ارسال‌شده
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = (input.name || "").trim();
      if (!name) return { ok: false as const, error: "validation", detail: "name" };
      patch.name = name;
    }
    if (input.slug !== undefined) {
      const s = normalizeProductSlug((input.slug || "").trim());
      if (s) patch.slug = s;
    }

    // ۳۰۱ خودکار وقتی اسلاگ محصول عوض می‌شود
    let oldSlugForRedirect: string | null = null;
    if (patch.slug) {
      const { data: prev } = await gate.supabase
        .from("products")
        .select("slug")
        .eq("id", id)
        .maybeSingle();
      const prevSlug = String(prev?.slug ?? "").trim();
      const nextSlug = String(patch.slug).trim();
      if (prevSlug && nextSlug && prevSlug !== nextSlug) {
        oldSlugForRedirect = prevSlug;
      }
    }
    if (input.category_id !== undefined) {
      if (!input.category_id) return { ok: false as const, error: "validation", detail: "category" };
      patch.category_id = input.category_id;
    }
    if (input.brand_id !== undefined) patch.brand_id = input.brand_id || null;
    if (input.short_description !== undefined)
      patch.short_description = (input.short_description || "").trim() || null;
    if (input.description !== undefined)
      patch.description = (input.description || "").trim() || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.is_featured !== undefined) patch.is_featured = !!input.is_featured;
    if (input.is_new !== undefined) patch.is_new = !!input.is_new;
    if (input.is_bestseller !== undefined) patch.is_bestseller = !!input.is_bestseller;
    // products has no is_active column (only variants/categories/brands)
    if (input.weight_guide_id !== undefined) patch.weight_guide_id = input.weight_guide_id || null;
    if (input.published_at !== undefined) patch.published_at = input.published_at || null;

    if (input.meta_title !== undefined) patch.meta_title = (input.meta_title || "").trim() || null;
    if (input.meta_description !== undefined) patch.meta_description = (input.meta_description || "").trim() || null;
    if (input.focus_keyphrases !== undefined) patch.focus_keyphrases = Array.isArray(input.focus_keyphrases) ? input.focus_keyphrases : [];
    if (input.og_title !== undefined) patch.og_title = (input.og_title || "").trim() || null;
    if (input.og_description !== undefined) patch.og_description = (input.og_description || "").trim() || null;
    if (input.og_image_url !== undefined) patch.og_image_url = (input.og_image_url || "").trim() || null;
    if (input.twitter_title !== undefined) patch.twitter_title = (input.twitter_title || "").trim() || null;
    if (input.twitter_description !== undefined) patch.twitter_description = (input.twitter_description || "").trim() || null;
    if (input.robots_index !== undefined) patch.robots_index = !!input.robots_index;
    if (input.robots_follow !== undefined) patch.robots_follow = !!input.robots_follow;
    if (input.is_cornerstone !== undefined) patch.is_cornerstone = !!input.is_cornerstone;
    if (input.canonical_url !== undefined) patch.canonical_url = (input.canonical_url || "").trim() || null;

    if (Object.keys(patch).length) {
      const { error: pErr } = await gate.supabase
        .from("products")
        .update(patch as any)
        .eq("id", id);
      if (pErr) {
        console.error("[adminUpdateProduct products]", pErr);
        return {
          ok: false as const,
          error: "server" as const,
          detail: pErr.message,
        };
      }
      if (oldSlugForRedirect && patch.slug) {
        try {
          await upsertUrlRedirect({
            fromPath: productPathFromSlug(oldSlugForRedirect),
            toPath: productPathFromSlug(String(patch.slug)),
            statusCode: 301,
            source: "product_slug_change",
            note: `product ${id}`,
          });
        } catch (re) {
          console.warn("[adminUpdateProduct slug redirect]", re);
        }
      }
    }

    const name = String(patch.name ?? input.name ?? "").trim() || "product";
    const price =
      input.price !== undefined && Number.isFinite(Number(input.price))
        ? Number(input.price)
        : undefined;

    // فقط اگر محصول هنوز «تک‌واریانت ساده» است (بدون مناسبت‌ها/وضعیت محصول) قیمت را روی همان یکی بنویس.
    // اگر واریانت مناسبت‌ها/وضعیت محصول‌دار وجود دارد، هرگز این‌جا دست نزن — sync جداگانه مسئول است.
    const { data: allVars } = await gate.supabase
      .from("product_variants")
      .select("id, weight, roast_name, is_active")
      .eq("product_id", id)
      .order("created_at", { ascending: true });

    const hasSized = (allVars ?? []).some(
      (v: { weight?: string | null; roast_name?: string | null }) =>
        !!(v.weight || v.roast_name),
    );
    const firstSimple = (allVars ?? []).find(
      (v: { weight?: string | null; roast_name?: string | null }) =>
        !v.weight && !v.roast_name,
    );

    if (!hasSized && firstSimple?.id && price !== undefined) {
      if (price < 0) {
        return { ok: false as const, error: "price" };
      }
      const { error: vErr } = await gate.supabase
        .from("product_variants")
        .update({
          price,
          original_price:
            input.original_price != null &&
            Number.isFinite(Number(input.original_price))
              ? Number(input.original_price)
              : null,
          stock_quantity: Math.max(0, Number(input.stock_quantity ?? 0) || 0),
          is_active: true,
        })
        .eq("id", firstSimple.id);
      if (vErr) {
        console.error("[adminUpdateProduct variant]", vErr);
        return {
          ok: false as const,
          error: "server" as const,
          detail: vErr.message,
        };
      }
      if (Math.max(0, Number(input.stock_quantity ?? 0) || 0) > 0) {
        try {
          const { notifyStockAlertsForVariant } = await import(
            "@/lib/stock-alerts/notify"
          );
          await notifyStockAlertsForVariant(firstSimple.id as string);
        } catch (ne) {
          console.error("[adminUpdateProduct stock alert]", ne);
        }
      }
    }

    if (input.tag_ids) {
      await gate.supabase.from("product_tag_map").delete().eq("product_id", id);
      const tagIds = input.tag_ids.filter(Boolean);
      if (tagIds.length) {
        const { error: tErr } = await gate.supabase.from("product_tag_map").insert(
          tagIds.map((tag_id) => ({ product_id: id, tag_id })),
        );
        if (tErr) console.error("[product_tag_map update]", tErr);
      }
    }

    // تصویر شاخص
    const imageUrl = (input.image_url || "").trim();
    if (imageUrl) {
      const { data: imgs, error: listImgErr } = await gate.supabase
        .from("product_images")
        .select("id")
        .eq("product_id", id)
        .eq("is_primary", true)
        .limit(1);
      if (listImgErr) {
        console.error("[product_images list]", listImgErr);
        return {
          ok: false as const,
          error: "server" as const,
          detail: listImgErr.message,
        };
      }
      if (imgs?.[0]?.id) {
        const { error: imgErr } = await gate.supabase
          .from("product_images")
          .update({
            url: imageUrl,
            alt_text: (input.image_alt || name).trim() || null,
          })
          .eq("id", imgs[0].id);
        if (imgErr) {
          console.error("[product_images update]", imgErr);
          return {
            ok: false as const,
            error: "server" as const,
            detail: imgErr.message,
          };
        }
      } else {
        const { error: imgErr } = await gate.supabase.from("product_images").insert({
          product_id: id,
          url: imageUrl,
          alt_text: (input.image_alt || name).trim() || null,
          is_primary: true,
          sort_order: 0,
        });
        if (imgErr) {
          console.error("[product_images insert]", imgErr);
          return {
            ok: false as const,
            error: "server" as const,
            detail: imgErr.message,
          };
        }
      }
    }

    try {
      const { data: allVars } = await gate.supabase
        .from("product_variants")
        .select("id, price, original_price, is_active")
        .eq("product_id", id);
      const { recordProductPrice } = await import("@/lib/price-history");
      await recordProductPrice({
        productId: id,
        variants: (allVars ?? []) as {
          price?: number | null;
          original_price?: number | null;
          is_active?: boolean | null;
        }[],
        supabase: gate.supabase,
      });
    } catch {
      /* optional */
    }

    await revalidateProductPaths(gate.supabase, id);
    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdateProduct]", e);
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


export async function adminUpdateProductFlagsAction(
  id: string,
  patch: Partial<{
    status: "draft" | "published" | "archived";
    is_featured: boolean;
    is_new: boolean;
    is_bestseller: boolean;
  }>,
) {
  return adminSetProductFlagsAction(id, patch);
}

/** حذف نرم — فقط deleted_at؛ از لیست ادمین و فروشگاه خارج می‌شود. */
export async function adminSoftDeleteProductAction(id: string) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!id?.trim()) return { ok: false as const, error: "invalid" as const };
  try {
    const { error } = await gate.supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw error;
    void adminWriteLogAction({
      action: "product_soft_delete",
      entity: "product",
      entity_id: id,
      meta: undefined,
    });
    return { ok: true as const };
  } catch (e) {
    console.error("[adminSoftDeleteProduct]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/** همگام‌سازی وریانت‌ها: upsert + حذف آن‌هایی که در لیست نیستند */
/** همگام‌سازی وریانت‌ها: upsert + حذف آن‌هایی که در لیست نیستند + تصویر واریانت */
/** همگام‌سازی وریانت‌ها — بدون حذف کور؛ فقط upsert + لینک تصویر */
/** همگام‌سازی وریانت‌ها — match با id یا weight+roast؛ بدون duplicate */
/** بازگردانی از بایگانی */
export async function adminRestoreProductsAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = Array.from(new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean)));
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("products")
      .update({ deleted_at: null, status: "draft" })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminRestoreProducts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminSyncProductVariantsAction(
  productId: string,
  variants: AdminVariantInput[],
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!productId) return { ok: false as const, error: "product_required" };

  try {
    const cleaned = (variants ?? [])
      .map((v) => {
        const rawPrice = Number(v.price);
        const rawOriginal =
          v.original_price != null && Number.isFinite(Number(v.original_price))
            ? Number(v.original_price)
            : null;
        // اگر price نامعتبر بود از original_price استفاده کن
        let price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : NaN;
        if (!Number.isFinite(price) && rawOriginal != null && rawOriginal >= 0) {
          price = rawOriginal;
        }
        return {
          id: (v.id || "").trim() || undefined,
          weight: (v.weight || "").trim() || null,
          roast_name: (v.roast_name || "").trim() || null,
          roast_hex: (v.roast_hex || "").trim() || null,
          sku: (v.sku || "").trim() || null,
          price,
          original_price: rawOriginal,
          stock_quantity: Math.max(0, Number(v.stock_quantity ?? 0) || 0),
          is_active: v.is_active !== false,
          image_url: (v.image_url || "").trim() || null,
        };
      })
      .filter((v) => Number.isFinite(v.price) && v.price >= 0);

    if (!cleaned.length) {
      return {
        ok: false as const,
        error: "variants_required" as const,
        detail: "حداقل یک واریانت با قیمت معتبر لازم است",
      };
    }

    // SKU تکراری در payload → null
    {
      const seen = new Set<string>();
      for (const v of cleaned) {
        if (!v.sku) continue;
        if (seen.has(v.sku)) v.sku = null;
        else seen.add(v.sku);
      }
    }

    // ترکیب weight+roast تکراری در payload → ادغام (اولی می‌ماند)
    {
      const seenKey = new Set<string>();
      const deduped: typeof cleaned = [];
      for (const v of cleaned) {
        const key = `${v.weight ?? ""}||${v.roast_name ?? ""}`;
        if (seenKey.has(key)) {
          console.warn("[sync] duplicate weight+roast in form, skip", key);
          continue;
        }
        seenKey.add(key);
        deduped.push(v);
      }
      cleaned.length = 0;
      cleaned.push(...deduped);
    }

    const { data: existingRows, error: listErr } = await gate.supabase
      .from("product_variants")
      .select("id, weight, roast_name, sku")
      .eq("product_id", productId);
    if (listErr) {
      console.error("[sync list]", listErr);
      return { ok: false as const, error: "server" as const, detail: listErr.message };
    }
    const existing = (existingRows ?? []) as {
      id: string;
      weight: string | null;
      roast_name: string | null;
      sku: string | null;
    }[];

    const resolved: {
      id: string;
      weight: string | null;
      roast_name: string | null;
      image_url: string | null;
    }[] = [];

    for (const v of cleaned) {
      const row = {
        product_id: productId,
        weight: v.weight,
        roast_name: v.roast_name,
        roast_hex: v.roast_hex,
        sku: v.sku,
        price: v.price,
        original_price: v.original_price,
        stock_quantity: v.stock_quantity,
        is_active: v.is_active,
      };

      // 1) با id
      let targetId = v.id;
      // 2) همان weight+roast
      if (!targetId) {
        const hit = existing.find(
          (e) =>
            (e.weight || null) === v.weight &&
            (e.roast_name || null) === v.roast_name,
        );
        targetId = hit?.id;
      }
      // 3) اگر id داده شده ولی weight+roast با دیگری تداخل دارد → همان ردیف weight+roast
      if (targetId) {
        const clash = existing.find(
          (e) =>
            e.id !== targetId &&
            (e.weight || null) === v.weight &&
            (e.roast_name || null) === v.roast_name,
        );
        if (clash) {
          targetId = clash.id;
        }
      }

      // SKU تداخل با وریانت دیگر
      if (row.sku) {
        const skuClash = existing.find(
          (e) => e.sku === row.sku && e.id !== targetId,
        );
        if (skuClash) row.sku = null;
      }

      if (targetId) {
        const { error } = await gate.supabase
          .from("product_variants")
          .update(row)
          .eq("id", targetId)
          .eq("product_id", productId);
        if (error) {
          console.error("[sync update]", error);
          return {
            ok: false as const,
            error: "server" as const,
            detail: error.message,
          };
        }
        resolved.push({
          id: targetId,
          weight: v.weight,
          roast_name: v.roast_name,
          image_url: v.image_url,
        });
      } else {
        const { data: inserted, error } = await gate.supabase
          .from("product_variants")
          .insert(row)
          .select("id")
          .single();
        if (error) {
          // اگر unique خورد، دوباره با weight+roast پیدا کن و update کن
          if (String(error.message || "").includes("product_variants_product_id_weight_roast_name")) {
            let qAgain = gate.supabase
              .from("product_variants")
              .select("id")
              .eq("product_id", productId);
            qAgain = v.weight == null ? qAgain.is("weight", null) : qAgain.eq("weight", v.weight as string);
            qAgain =
              v.roast_name == null
                ? qAgain.is("roast_name", null)
                : qAgain.eq("roast_name", v.roast_name as string);
            const { data: again } = await qAgain.limit(1);
            const foundId = (again as { id: string }[] | null)?.[0]?.id;
            if (foundId) {
              const { error: u2 } = await gate.supabase
                .from("product_variants")
                .update(row)
                .eq("id", foundId);
              if (u2) {
                return {
                  ok: false as const,
                  error: "server" as const,
                  detail: u2.message,
                };
              }
              resolved.push({
                id: foundId,
                weight: v.weight,
                roast_name: v.roast_name,
                image_url: v.image_url,
              });
              continue;
            }
          }
          console.error("[sync insert]", error);
          return {
            ok: false as const,
            error: "server" as const,
            detail: error.message,
          };
        }
        resolved.push({
          id: inserted.id as string,
          weight: v.weight,
          roast_name: v.roast_name,
          image_url: v.image_url,
        });
        existing.push({
          id: inserted.id as string,
          weight: v.weight,
          roast_name: v.roast_name,
          sku: row.sku,
        });
      }
    }

    // وریانت‌های خارج از فرم را غیرفعال کن (حذف فیزیکی نکن)
    const keep = new Set(resolved.map((r) => r.id));
    for (const e of existing) {
      if (!keep.has(e.id)) {
        await gate.supabase
          .from("product_variants")
          .update({ is_active: false })
          .eq("id", e.id);
      }
    }

    try {
      await linkVariantImages(
        gate.supabase,
        productId,
        resolved.map((r) => ({
          id: r.id,
          weight: r.weight,
          roast_name: r.roast_name,
          image_url: r.image_url,
        })),
      );
    } catch (e) {
      console.error("[linkVariantImages sync]", e);
    }

    try {
      const { data: allVars } = await gate.supabase
        .from("product_variants")
        .select("id, price, original_price, is_active")
        .eq("product_id", productId);
      await recordProductPrice({
        productId,
        variants: (allVars ?? []) as {
          price?: number | null;
          original_price?: number | null;
          is_active?: boolean | null;
        }[],
        supabase: gate.supabase,
      });
    } catch (e) {
      console.error("[sync recordProductPrice]", e);
    }

    try {
      await revalidateProductPaths(gate.supabase, productId);
    } catch (re) {
      console.warn("[sync revalidate]", re);
    }

    return { ok: true as const, count: resolved.length };
  } catch (e) {
    console.error("[adminSyncProductVariants]", e);
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


/** تصویر گالری محصول — بدون variant_id، is_primary=false */
export async function adminAddProductGalleryImageAction(input: {
  productId: string;
  url: string;
  alt_text?: string | null;
}) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const productId = (input.productId || "").trim();
  const url = (input.url || "").trim();
  if (!productId || !url) {
    return { ok: false as const, error: "invalid" as const };
  }

  const { data: maxRow } = await gate.supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .is("variant_id", null)
    .eq("is_primary", false)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await gate.supabase
    .from("product_images")
    .insert({
      product_id: productId,
      url,
      alt_text: (input.alt_text || "").trim() || null,
      is_primary: false,
      variant_id: null,
      sort_order,
    })
    .select("id, url, alt_text, sort_order")
    .single();

  if (error) {
    console.error("[adminAddProductGalleryImage]", error);
    return { ok: false as const, error: "server" as const, detail: error.message };
  }
  await revalidateProductPaths(gate.supabase, productId);
  return { ok: true as const, image: data };
}


/** Unique slug check for wizard step 1. */
export async function adminCheckProductSlugAction(
  slug: string,
  excludeId?: string | null,
): Promise<{ ok: true; available: boolean } | { ok: false; error: string }> {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const s = (slug || "").trim();
  if (!s) return { ok: false as const, error: "slug_empty" };
  // فارسی + لاتین؛ فقط فاصله‌های اطراف trim شده 
  try {
    let q = gate.supabase.from("products").select("id").eq("slug", s).is("deleted_at", null).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return { ok: true as const, available: !data };
  } catch (e) {
    console.error("[adminCheckProductSlug]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminListSizeGuidesAction() {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { data, error } = await gate.supabase
      .from("weight_guides")
      .select("id, name, category_id, description")
      .order("name", { ascending: true });
    if (error) throw error;
    return { ok: true as const, data: data ?? [] };
  } catch (e) {
    console.error("[adminListSizeGuides]", e);
    return { ok: false as const, error: "server" };
  }
}

export async function adminQuickUpdateProductAction(
  id: string,
  patch: Partial<{
    name: string;
    category_id: string | null;
    brand_id: string | null;
  }>,
) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const body: {
      name?: string;
      category_id?: string | null;
      brand_id?: string | null;
    } = {};
    if (patch.name !== undefined) {
      const name = String(patch.name || "").trim();
      if (!name) return { ok: false as const, error: "name_required" };
      body.name = name;
      // slug intentionally NOT touched
    }
    if (patch.category_id !== undefined) body.category_id = patch.category_id || null;
    if (patch.brand_id !== undefined) body.brand_id = patch.brand_id || null;
    if (!Object.keys(body).length) return { ok: true as const };
    const { error } = await gate.supabase
      .from("products")
      .update(body as any)
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/products");
    return { ok: true as const };
  } catch (e) {
    console.error("[adminQuickUpdateProduct]", e);
    return { ok: false as const, error: "server" };
  }
}

/**
 * ناموجود سریع — بدون نابود کردن عدد موجودی.
 * out=true  → is_active=false روی همه واریانت‌ها
 * out=false → is_active=true (موجودی قبلی حفظ می‌شود)
 */
export async function adminSetProductOutOfStockAction(id: string, out: boolean) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase
      .from("product_variants")
      .update({ is_active: !out })
      .eq("product_id", id);
    if (error) throw error;
    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (e) {
    console.error("[adminSetProductOutOfStock]", e);
    return { ok: false as const, error: "server" };
  }
}

