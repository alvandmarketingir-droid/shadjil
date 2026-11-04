import { createClient } from "@/lib/supabase/server";

export type RelatedProductCard = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number | null;
};

/** محصولات مرتبط: همان دسته، بدون خود محصول */
export async function getRelatedProducts(
  productId: string,
  categoryId: string | null | undefined,
  limit = 8,
): Promise<RelatedProductCard[]> {
  if (!categoryId) return [];
  try {
    const supabase = await createClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug")
      .eq("category_id", categoryId)
      .eq("status", "published")
      .is("deleted_at", null)
      .neq("id", productId)
      .limit(limit);
    if (error || !products?.length) return [];

    const ids = products.map((p) => p.id);
    const [{ data: images }, { data: variants }] = await Promise.all([
      supabase
        .from("product_images")
        .select("product_id, url, is_primary")
        .in("product_id", ids),
      supabase
        .from("product_variants")
        .select("product_id, price")
        .in("product_id", ids)
        .eq("is_active", true),
    ]);

    const imgMap = new Map<string, string>();
    for (const img of images ?? []) {
      const pid = img.product_id;
      if (!pid) continue;
      if (img.is_primary && !imgMap.has(pid)) {
        imgMap.set(pid, img.url);
      }
    }
    for (const img of images ?? []) {
      const pid = img.product_id;
      if (!pid) continue;
      if (!imgMap.has(pid)) imgMap.set(pid, img.url);
    }
    const priceMap = new Map<string, number>();
    for (const v of variants ?? []) {
      if (!priceMap.has(v.product_id) && v.price != null) {
        priceMap.set(v.product_id, Number(v.price));
      }
    }

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image_url: imgMap.get(p.id) ?? null,
      price: priceMap.get(p.id) ?? null,
    }));
  } catch (e) {
    console.error("[getRelatedProducts]", e);
    return [];
  }
}
