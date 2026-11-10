import { CatalogRealtimeRefresh } from "@/components/shop/catalog-realtime-refresh";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryService } from "@/services/category.service";
import { ProductService } from "@/services/product.service";
import { AttributeService } from "@/services/attribute.service";
import { ColorRepository } from "@/repositories/color.repository";
import { SizeRepository } from "@/repositories/size.repository";
import { ProductInfiniteList } from "@/components/product/product-infinite-list";
import { ProductFiltersSidebar } from "@/components/product/product-filters-sidebar";
import { ProductFiltersMobile } from "@/components/product/product-filters-mobile";
import { facetSlugsForCategory } from "@/lib/facet-map";
import { toPersianDigits } from "@/lib/numbers";
import { JsonLd } from "@/components/seo/json-ld";
import { collectionPageSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { applySeoTemplate } from "@/lib/seo/template";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function decodeSlug(raw: string): string {
  let s = raw;
  for (let i = 0; i < 3; i++) {
    try {
      const d = decodeURIComponent(s);
      if (d === s) break;
      s = d;
    } catch {
      break;
    }
  }
  return s;
}

const FACET_KEYS = [
  "weight",
  "nut-type",
  "origin",
  "packaging",
  "grade",
  "roast-type",
  "salted",
  "raw",
  "pack-weight",
  "quality",
  "organic",
  "gift-box",
  "usage",
  "origin",
  "weight-250",
  "weight-500",
  "weight-1kg",
  "premium",
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlug((await params).slug);
  const categoryService = new CategoryService();
  const result = await categoryService.getBySlug(slug);
  if (!result.success || !result.data) {
    return { title: "دسته‌بندی‌ها" };
  }
  const d = result.data as {
    name: string;
    description?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    robots_index?: boolean | null;
  };
  const title = applySeoTemplate(d.meta_title, { name: d.name }) || d.name;
  const description =
    applySeoTemplate(d.meta_description, {
      name: d.name,
      description: d.description || undefined,
    }) ||
    d.description ||
    `محصولات دسته ${d.name}`;
  return {
    title,
    description,
    robots: d.robots_index === false ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryListingPage({
  params,
  searchParams,
}: Props) {
  const slug = decodeSlug((await params).slug);
  const sp = await searchParams;

  const categoryService = new CategoryService();
  const productService = new ProductService();

  const catResult = await categoryService.getBySlug(slug);
  if (!catResult.success || !catResult.data) notFound();

  const category = catResult.data;

  const rootsResult = await categoryService.getRoots();
  const categories = rootsResult.success
    ? (rootsResult.data ?? []).map((c) => ({ name: c.name, slug: c.slug }))
    : [];

  const brandSlug = typeof sp.brand === "string" ? sp.brand : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const sort =
    typeof sp.sort === "string"
      ? (sp.sort as "newest" | "price_asc" | "price_desc" | "popular")
      : "newest";
  const featured = sp.featured === "1" ? true : undefined;
  const minPrice =
    typeof sp.minPrice === "string" && sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice =
    typeof sp.maxPrice === "string" && sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const roastSlug =
    typeof sp.roast === "string" && sp.roast ? sp.roast : undefined;
  const weightSlug = typeof sp.weight === "string" && sp.weight ? sp.weight : undefined;

  const attrs: Record<string, string> = {};
  for (const key of FACET_KEYS) {
    const v = sp[key];
    if (typeof v === "string" && v) attrs[key] = v;
  }

  const attributeService = new AttributeService();
  const facetsResult = await attributeService.getFilterableFacets();
  const allFacets = (facetsResult.success && facetsResult.data) ? facetsResult.data : [];
  const allowed = new Set(facetSlugsForCategory(slug));
  const facets = allFacets.filter((f) => allowed.has(f.slug));

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
  if (roastSlug && !roastAttr) {
    const c = await roastRepo.findBySlug(roastSlug).catch(() => null);
    roastId = c?.id;
  }
  if (weightSlug && !weightAttr) {
    const s = await weightRepo.findBySlug(weightSlug).catch(() => null);
    weightId = s?.id;
  }

  const result = await productService.getPublishedProducts({
    page: 1,
    pageSize: 12,
    categorySlug: slug,
    brandSlug,
    q,
    sort,
    featured,
    attrs: Object.keys(attrs).length ? attrs : undefined,
    minPrice: minPrice && !Number.isNaN(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice && !Number.isNaN(maxPrice) ? maxPrice : undefined,
    roastId,
    weightId,
    weightValue,
    roastValue,
  });

  if (!result.success || !result.data) {
    return (
      <>
        <CatalogRealtimeRefresh />
        <main className="w-full max-w-none mx-auto px-4 py-12">
          <p className="text-destructive text-center">{result.error ?? "خطا"}</p>
        </main>
      </>
    );
  }

  const { data: products, total, page, totalPages } = result.data;
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(
    /\/$/,
    "",
  );

  return (
    <main className="w-full max-w-none mx-auto px-4 py-8 md:py-12">
      <JsonLd
        data={[
          collectionPageSchema({
            name: category.name,
            description: category.description,
            url: `/${encodeURIComponent(slug)}`,
          }),
          breadcrumbSchema([
            { name: "خانه", url: siteBase + "/" },
            { name: "فروشگاه", url: siteBase + "/products" },
            {
              name: category.name,
              url: siteBase + "/" + encodeURIComponent(slug),
            },
          ]),
        ]}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold md:text-3xl text-primary">{category.name}</h1>
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
        categorySlug={slug}
        brandSlug={brandSlug}
        q={q}
        sort={sort}
        featured={featured}
        minPrice={minPrice}
        maxPrice={maxPrice}
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <Suspense
          fallback={
            <aside className="border-border bg-card hidden w-64 shrink-0 rounded-xl border p-4 lg:block" />
          }
        >
          <ProductFiltersSidebar
            roasts={roasts}
            weights={weights}
            roastSlug={roastSlug}
            weightSlug={weightSlug}
            facets={facets}
            current={attrs}
            categories={categories}
            categorySlug={slug}
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
            categorySlug={slug}
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

      {category.description ? (
        <section className="border-border mt-12 border-t pt-8">
          <h2 className="mb-3 text-lg font-semibold text-primary">درباره {category.name}</h2>
          <div className="text-muted-foreground prose prose-sm max-w-none leading-7 whitespace-pre-line">
            {category.description}
          </div>
        </section>
      ) : null}
    </main>
  );
}
