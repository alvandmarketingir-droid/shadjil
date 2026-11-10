import { CatalogRealtimeRefresh } from "@/components/shop/catalog-realtime-refresh";
import type { Metadata } from "next";
import { ProductService } from "@/services/product.service";
import { ProductInfiniteList } from "@/components/product/product-infinite-list";
import { CategoryService } from "@/services/category.service";
import { AttributeService } from "@/services/attribute.service";
import { ColorRepository } from "@/repositories/color.repository";
import { SizeRepository } from "@/repositories/size.repository";
import { ProductFiltersSidebar } from "@/components/product/product-filters-sidebar";
import { ProductFiltersMobile } from "@/components/product/product-filters-mobile";
import { facetSlugsForCategory } from "@/lib/facet-map";
import { toPersianDigits } from "@/lib/numbers";
import { Suspense } from "react";
import { metadataFromSeoPage } from "@/lib/seo/page-settings";

export const revalidate = 60;

// ISR: HTML کامل سرور-ساید، کش ۶۰ ثانیه — فیلترها و ظاهر دست‌نخورده
export async function generateMetadata(): Promise<Metadata> {
  return metadataFromSeoPage("shop_plp", {
    title: "محصولات",
    description: "لیست محصولات فروشگاه تخصصی شادجیل",
  });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const service = new ProductService();
  const categoryService = new CategoryService();
  const rootsResult = await categoryService.getRoots();
  const categories = rootsResult.success && rootsResult.data
    ? rootsResult.data.map((c) => ({ name: c.name, slug: c.slug }))
    : [];

  const categorySlug =
    typeof params.category === "string" ? params.category : undefined;
  const brandSlug =
    typeof params.brand === "string" ? params.brand : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;
  const sort =
    typeof params.sort === "string"
      ? (params.sort as "newest" | "price_asc" | "price_desc" | "popular")
      : "newest";
  const featured = params.featured === "1" ? true : undefined;
  const minPrice =
    typeof params.minPrice === "string" && params.minPrice
      ? Number(params.minPrice)
      : undefined;
  const maxPrice =
    typeof params.maxPrice === "string" && params.maxPrice
      ? Number(params.maxPrice)
      : undefined;

  const roastSlug =
    typeof params.roast === "string" && params.roast ? params.roast : undefined;
  const weightSlug =
    typeof params.weight === "string" && params.weight ? params.weight : undefined;

  const FACET_KEYS = [
    "weight",
    "type",
    "origin",
    "packaging",
    "grade",
    "roast",
    "salted",
    "raw",
    "weight-pack",
    "quality",
    "organic",
    "gift",
    "usage",
    "origin",
    "weight-250",
    "weight-500",
    "weight-1kg",
    "premium",
  ] as const;

  const attrs: Record<string, string> = {};
  for (const key of FACET_KEYS) {
    const v = params[key];
    if (typeof v === "string" && v) attrs[key] = v;
  }

  const attributeService = new AttributeService();
  const facetsResult = await attributeService.getFilterableFacets();
  const allFacets = facetsResult.success ? (facetsResult.data ?? []) : [];
  const allowed = new Set(facetSlugsForCategory(categorySlug));
  const facets = allFacets.filter((f) => allowed.has(f.slug));

  
  // منبع اصلی: attribute options (weight/roast) — fallback: جداول weights/roasts
  const roastAttr = allFacets.find((f) => f.slug === "roast");
  const weightAttr = allFacets.find((f) => f.slug === "weight");
  type Chip = { id: string; name: string; slug: string; hex?: string | null };
  let roasts: Chip[] = (roastAttr?.options ?? []).map((o) => ({
    id: o.id,
    name: o.value,
    slug: o.slug || o.value,
    hex: (o as { hex?: string | null }).hex ?? null,
  }));
  let weights: Chip[] = (weightAttr?.options ?? []).map((o) => ({
    id: o.id,
    name: o.value,
    slug: o.slug || o.value,
  }));
  const roastRepo = new ColorRepository();
  const weightRepo = new SizeRepository();
  if (!roasts.length || !weights.length) {
    const [legacyColors, legacySizes] = await Promise.all([
      roastRepo.findAllActive().catch(() => [] as Awaited<ReturnType<ColorRepository["findAllActive"]>>),
      weightRepo.findAllActive().catch(() => [] as Awaited<ReturnType<SizeRepository["findAllActive"]>>),
    ]);
    if (!roasts.length) {
      roasts = legacyColors.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        hex:
          (c as { hex_code?: string | null }).hex_code ??
          (c as { hex?: string | null }).hex ??
          null,
      }));
    }
    if (!weights.length) {
      weights = legacySizes.map((s) => ({ id: s.id, name: s.name, slug: s.slug }));
    }
  }
  const roastOpt = roastSlug
    ? roasts.find((c) => c.slug === roastSlug || c.name === roastSlug)
    : undefined;
  const weightOpt = weightSlug
    ? weights.find((s) => s.slug === weightSlug || s.name === weightSlug)
    : undefined;
  const roastValue = roastOpt?.name;
  const weightValue = weightOpt?.name;
  let roastId: string | undefined;
  let weightId: string | undefined;
  // فقط fallback legacy id وقتی از جدول قدیمی آمده
  if (roastSlug && !roastAttr) {
    const c = await roastRepo.findBySlug(roastSlug).catch(() => null);
    roastId = c?.id;
  }
  if (weightSlug && !weightAttr) {
    const s = await weightRepo.findBySlug(weightSlug).catch(() => null);
    weightId = s?.id;
  }

  const result = await service.getPublishedProducts({
    page: 1,
    pageSize: 12,
    categorySlug,
    brandSlug,
    q,
    sort,
    featured,
    attrs: Object.keys(attrs).length ? attrs : undefined,
    minPrice: minPrice && !Number.isNaN(minPrice) ? minPrice : undefined,
    roastId,
    weightId,
    weightValue,
    roastValue,
    maxPrice: maxPrice && !Number.isNaN(maxPrice) ? maxPrice : undefined,
  });

  if (!result.success) {
    return (
    <>
      <CatalogRealtimeRefresh />

      <main className="w-full max-w-none mx-auto px-4 py-12">
        <p className="text-destructive text-center">{result.error}</p>
      </main>
    </>
    );
  }

  if (!result.data) {
    return (
      <main className="w-full max-w-none mx-auto px-4 py-12">
        <p className="text-destructive text-center">خطا در بارگذاری</p>
      </main>
    );
  }
  const { data: products, total, page, totalPages } = result.data;

  return (
    <main className="w-full max-w-none mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-iranyekan-heavy text-primary">محصولات</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {toPersianDigits(String(total))} محصول
        </p>
      </div>
<ProductFiltersMobile
          roasts={roasts}
          weights={weights}
          roastSlug={roastSlug}
          weightSlug={weightSlug}
        facets={facets}
        current={attrs}
        categories={categories}
        categorySlug={categorySlug}
        brandSlug={brandSlug}
        q={q}
        sort={sort}
        featured={featured}
        minPrice={minPrice}
        maxPrice={maxPrice}
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <Suspense fallback={<aside className="border-border bg-card hidden w-64 shrink-0 rounded-xl border p-4 lg:block" />}>
        <ProductFiltersSidebar
          roasts={roasts}
          weights={weights}
          roastSlug={roastSlug}
          weightSlug={weightSlug}
          facets={facets}
          current={attrs}
          categories={categories}
          categorySlug={categorySlug}
          brandSlug={brandSlug}
          q={q}
          sort={sort}
          featured={featured}
          minPrice={minPrice}
          maxPrice={maxPrice}
        />
        </Suspense>
        <div className="min-w-0 flex-1">
          <ProductInfiniteList
            roastId={roastId}
            weightId={weightId}
            initialProducts={products}
            initialPage={page}
            initialHasMore={page < totalPages}
            categorySlug={categorySlug}
            brandSlug={brandSlug}
            q={q}
            sort={sort}
            featured={featured}
            attrs={Object.keys(attrs).length ? attrs : undefined}
            minPrice={minPrice && !Number.isNaN(minPrice) ? minPrice : undefined}
            maxPrice={maxPrice && !Number.isNaN(maxPrice) ? maxPrice : undefined}
          />
        </div>
      </div>
    </main>
  );
}
