import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  expandTypoVariants,
  normalizeSearchQuery,
} from "@/lib/search/normalize";
import { EmptyBlock } from "@/components/ui/ui-state-blocks";
import { TrackSearch } from "@/components/analytics/track-search";
import { isBlockedBrand } from "@/lib/brands/blocked";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams;
  const q = normalizeSearchQuery(sp.q || "");
  return { title: q ? `نتایج جستجو: ${q}` : "جستجو" };
}

function minPrice(
  variants: { price?: number; is_active?: boolean | null }[] | null | undefined,
): number | null {
  const prices = (variants ?? [])
    .filter((v) => v.is_active !== false)
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

const SELECT = `
  id, name, slug, category_id,
  brand:brands ( name, slug ),
  category:categories ( name, slug ),
  images:product_images ( url, is_primary ),
  variants:product_variants ( price, is_active )
`;

type P = {
  id: string;
  name: string;
  slug: string;
  brand?: { name?: string; slug?: string } | null;
  category?: { name?: string; slug?: string } | null;
  images?: { url?: string; is_primary?: boolean }[] | null;
  variants?: { price?: number; is_active?: boolean | null }[] | null;
};

export default async function SearchResultsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = normalizeSearchQuery(sp.q || "");
  const terms = expandTypoVariants(q);

  if (q.length < 2) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10" dir="rtl">
        <h1 className="text-xl font-bold text-primary">جستجو</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          عبارت جستجو را وارد کنید (حداقل ۲ کاراکتر).
        </p>
        <Link href="/products" className="text-primary mt-4 inline-block text-sm underline">
          مشاهده همه محصولات
        </Link>
      </main>
    );
  }

  const supabase = await createClient();
  const byId = new Map<string, P>();

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
    for (const row of (data as unknown as P[]) ?? []) byId.set(row.id, row);
  }

  const { data: allCats } = await supabase
    .from("categories")
    .select("id, name, slug")
    .limit(100);
  const matchedCatIds: string[] = [];
  const catMap = new Map<string, { name: string; slug: string }>();
  for (const c of allCats ?? []) {
    const name = String(c.name || "");
    const slug = String(c.slug || "");
    if (terms.some((t) => name.includes(t))) {
      matchedCatIds.push(String(c.id));
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
    for (const row of (data as unknown as P[]) ?? []) byId.set(row.id, row);
  }

  const products = [...byId.values()];
  const brandMap = new Map<string, { name: string; slug: string }>();
  for (const p of products) {
    if (p.category?.slug && p.category.name)
      catMap.set(p.category.slug, { name: p.category.name, slug: p.category.slug });
    if (p.brand?.slug && p.brand.name)
      brandMap.set(p.brand.slug, { name: p.brand.name, slug: p.brand.slug });
  }
  const { data: allBrands } = await supabase.from("brands").select("name, slug").limit(80);
  for (const b of allBrands ?? []) {
    const name = String(b.name || "");
    const slug = String(b.slug || "");
    if (isBlockedBrand({ name, slug })) continue;
    if (terms.some((t) => name.toLowerCase().includes(t.toLowerCase())))
      brandMap.set(slug, { name, slug });
  }
  for (const [slug, b] of [...brandMap.entries()]) {
    if (isBlockedBrand(b)) brandMap.delete(slug);
  }

  const categories = [...catMap.values()];
  const brands = [...brandMap.values()];

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 md:py-12" dir="rtl">
      <TrackSearch term={q} resultCount={products.length} />
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-primary md:text-2xl">
          نتایج جستجو برای «{q}»
        </h1>
        <p className="text-muted-foreground text-sm">
          {products.length} محصول
          {categories.length ? ` · ${categories.length} دسته` : ""}
          {brands.length ? ` · ${brands.length} برچسب` : ""}
        </p>
      </header>

      {/* ۱) محصولات اول */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary">محصولات</h2>
          <Link
            href={`/products?q=${encodeURIComponent(q)}`}
            className="text-muted-foreground text-xs underline"
          >
            مشاهده در فروشگاه با فیلتر
          </Link>
        </div>
        {products.length === 0 ? (
          <EmptyBlock
          title="محصولی یافت نشد"
          description="عبارت دیگری را امتحان کنید یا به فروشگاه برگردید."
        />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((p) => {
              const img =
                p.images?.find((i) => i.is_primary)?.url ??
                p.images?.[0]?.url ??
                null;
              const price = minPrice(p.variants);
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="border-border group overflow-hidden rounded-2xl border transition hover:shadow-sm"
                >
                  <div className="bg-muted relative aspect-[3/4] overflow-hidden">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        className="object-cover transition group-hover:scale-[1.02]"
                        weights="(max-width:768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                        بدون تصویر
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    {price != null ? (
                      <p className="text-primary text-sm font-bold">
                        {price.toLocaleString("fa-IR")} تومان
                      </p>
                    ) : null}
                    <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                    {p.category?.name ? (
                      <p className="text-muted-foreground text-[11px]">{p.category.name}</p>
                    ) : p.brand?.name ? (
                      <p className="text-muted-foreground text-[11px]">{p.brand.name}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {categories.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-primary">دسته‌بندی‌ها</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${encodeURIComponent(c.slug)}`}
                className="border-border hover:bg-muted rounded-xl border px-3 py-2 text-sm"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {brands.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-primary">برچسبها</h2>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={`/brands/${b.slug}`}
                className="border-border hover:bg-muted rounded-xl border px-3 py-2 text-sm"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
