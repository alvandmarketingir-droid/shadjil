import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  expandTypoVariants,
  normalizeSearchQuery,
} from "@/lib/search/normalize";
import { isBlockedBrand } from "@/lib/brands/blocked";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  brand?: { name?: string; slug?: string } | null;
  category?: { name?: string; slug?: string } | null;
  images?: { url?: string; is_primary?: boolean }[] | null;
  variants?: { price?: number; is_active?: boolean | null }[] | null;
};

function minPrice(variants: ProductRow["variants"]): number | null {
  const prices = (variants ?? [])
    .filter((v) => v.is_active !== false)
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

function primaryImage(images: ProductRow["images"]): string | null {
  if (!images?.length) return null;
  const p = images.find((i) => i.is_primary) ?? images[0];
  return p?.url ?? null;
}

const SELECT = `
  id, name, slug, category_id,
  brand:brands ( name, slug ),
  category:categories ( name, slug ),
  images:product_images ( url, is_primary ),
  variants:product_variants ( price, is_active )
`;

export async function GET(req: NextRequest) {
  const q = normalizeSearchQuery((req.nextUrl.searchParams.get("q") || "").trim());
  if (q.length < 2) {
    return NextResponse.json({ products: [], brands: [], categories: [], posts: [] });
  }
  const terms = expandTypoVariants(q);

  try {
    const supabase = await createClient();
    const byId = new Map<string, ProductRow>();

    // 1) match روی نام/توضیح/اسلاگ
    for (const term of terms) {
      const safe = term.replace(/%/g, "").slice(0, 80);
      if (!safe) continue;
      const { data } = await supabase
        .from("products")
        .select(SELECT)
        .eq("status", "published")
        .is("deleted_at", null)
        .or(`name.ilike.%${safe}%,short_description.ilike.%${safe}%,slug.ilike.%${safe}%`)
        .limit(48);
      for (const row of (data as unknown as ProductRow[]) ?? []) {
        byId.set(row.id, row);
      }
    }

    // 2) دسته‌هایی که نام‌شان match است → همه محصولات آن دسته‌ها
    const { data: allCats } = await supabase.from("categories").select("id, name, slug").limit(100);
    const matchedCatIds: string[] = [];
    const catMap = new Map<string, { name: string; slug: string }>();
    for (const c of allCats ?? []) {
      const name = String(c.name || "");
      const slug = String(c.slug || "");
      const id = String(c.id || "");
      if (terms.some((t) => name.includes(t))) {
        matchedCatIds.push(id);
        catMap.set(slug, { name, slug });
      }
    }
    if (matchedCatIds.length) {
      const { data } = await supabase
        .from("products")
        .select(SELECT)
        .eq("status", "published")
        .is("deleted_at", null)
        .in("category_id", matchedCatIds)
        .limit(48);
      for (const row of (data as unknown as ProductRow[]) ?? []) {
        byId.set(row.id, row);
      }
    }

    const products = [...byId.values()];

    for (const p of products) {
      if (p.category?.slug && p.category?.name) {
        catMap.set(p.category.slug, { name: p.category.name, slug: p.category.slug });
      }
    }

    const brandMap = new Map<string, { name: string; slug: string }>();
    for (const p of products) {
      if (p.brand?.slug && p.brand?.name) {
        brandMap.set(p.brand.slug, { name: p.brand.name, slug: p.brand.slug });
      }
    }
    const { data: allBrands } = await supabase.from("brands").select("name, slug").limit(80);
    for (const b of allBrands ?? []) {
      const name = String(b.name || "");
      const slug = String(b.slug || "");
      if (isBlockedBrand({ name, slug })) continue;
      if (terms.some((t) => name.toLowerCase().includes(t.toLowerCase()))) {
        brandMap.set(slug, { name, slug });
      }
    }
    for (const [slug, b] of [...brandMap.entries()]) {
      if (isBlockedBrand(b)) brandMap.delete(slug);
    }

    let posts: { title: string; slug: string }[] = [];
    try {
      const { data } = await supabase
        .from("blog_posts")
        .select("title, slug")
        .eq("status", "published")
        .ilike("title", "%" + terms[0] + "%")
        .limit(4);
      posts = (data ?? []).map((p) => ({ title: String(p.title), slug: String(p.slug) }));
    } catch {}

    return NextResponse.json({
      products: products.map((p) => ({
        name: p.name,
        slug: p.slug,
        brand: p.brand?.name ?? null,
        category: p.category?.name ?? null,
        image: primaryImage(p.images),
        price: minPrice(p.variants),
      })),
      categories: [...catMap.values()].slice(0, 12),
      brands: [...brandMap.values()].slice(0, 12),
      posts,
    });
  } catch (e) {
    console.error("[suggest]", e);
    return NextResponse.json({ products: [], brands: [], categories: [], posts: [] });
  }
}
