import { CatalogRealtimeRefresh } from "@/components/shop/catalog-realtime-refresh";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { BrandService } from "@/services/brand.service";
import { ProductService } from "@/services/product.service";
import { CategoryService } from "@/services/category.service";
import { AttributeService } from "@/services/attribute.service";
import { ColorRepository } from "@/repositories/color.repository";
import { SizeRepository } from "@/repositories/size.repository";
import { ProductInfiniteList } from "@/components/product/product-infinite-list";
import { ProductFiltersSidebar } from "@/components/product/product-filters-sidebar";
import { ProductFiltersMobile } from "@/components/product/product-filters-mobile";
import { facetSlugsForCategory } from "@/lib/facet-map";
import { toPersianDigits } from "@/lib/numbers";
import { JsonLd } from "@/components/seo/json-ld";
import { brandPageSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { applySeoTemplate } from "@/lib/seo/template";

export const revalidate = 60;

const FACET_KEYS = [
  "weight",
  "nut-type",
  "origin",
  "grade",
  "salted",
  "raw",
  "pack-weight",
  "weight-250",
  "weight-500",
  "weight-1kg",
  "premium",
] as const;

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlug((await params).slug);
  const brandService = new BrandService();
  const result = await brandService.getBySlug(slug);
  if (!result.success || !result.data) {
    return { title: "برچسب‌ها" };
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
    applySeoTemplate(d.meta_description, { name: d.name, description: d.description || undefined }) ||
    d.description ||
    `محصولات برچسب ${d.name}`;
  return {
    title,
    description,
    robots: d.robots_index === false ? { index: false, follow: true } : undefined,
  };
}

export default async function BrandListingPage({ params, searchParams }: Props) {
  const slug = decodeSlug((await params).slug);
  const sp = await searchParams;

  const brandService = new BrandService();
  const productService = new ProductService();
  const categoryService = new CategoryService();
  const attributeService = new AttributeService();

  const brandResult = await brandService.getBySlug(slug);
  if (!brandResult.success || !brandResult.data) notFound();
  const brand = brandResult.data;

  const categorySlug =
    typeof sp.category === "string" ? sp.category : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const sort =
    typeof sp.sort === "string"
      ? (sp.sort as "newest" | "price_asc" | "price_desc" | "popular")
      : "newest";
  const featured = sp.featured === "1" ? true : undefined;
  const minPrice =
    typeof sp.minPrice === "string" && sp.minPrice
      ? Number(sp.minPrice)
      : undefined;
  const maxPrice =
    typeof sp.maxPrice === "string" && sp.maxPrice
      ? Number(sp.maxPrice)
      : undefined;
  const roastSlug =
    typeof sp.roast === "string" && sp.roast ? sp.roast : undefined;
  const weightSlug =
    typeof sp.weight === "string" && sp.weight ? sp.weight : undefined;

  const attrs: Record<string, string> = {};
  for (const key of FACET_KEYS) {
    const v = sp[key];
    if (typeof v === "string" && v) attrs[key] = v;
  }

  const rootsResult = await categoryService.getRoots();
  const categories = rootsResult.success
    ? (rootsResult.data ?? []).map((c: { name: string; slug: string }) => ({ name: c.name, slug: c.slug }))
    : [];

  const facetsResult = await attributeService.getFilterableFacets();
  const allFacets = facetsResult.success ? (facetsResult.data ?? []) : [];
  const allowed = new Set(facetSlugsForCategory(categorySlug));
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
        hex: (c as { hex_code?: string | null }).hex_code ?? null,
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
    brandSlug: slug,
    categorySlug,
    q,
    sort,
    featured,
    attrs: Object.keys(attrs).length ? attrs : undefined,
    weightValue,
    roastValue,
    minPrice: minPrice && !Number.isNaN(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice && !Number.isNaN(maxPrice) ? maxPrice : undefined,
    roastId,
    weightId,
  });

  if (!result.success || !result.data) {
    return (
    <>
      <JsonLd
        data={[
          brandPageSchema({
            name: brand.name,
            description: (brand as { description?: string | null }).description,
            slug,
            logo: (brand as { logo_url?: string | null }).logo_url ?? null,
          }),
          breadcrumbSchema([
            { name: "خانه", url: ((process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "")) + "/" },
            { name: "برچسبها", url: ((process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "")) + "/brands" },
            { name: brand.name, url: ((process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "")) + "/" + encodeURIComponent(slug) },
          ]),
        ]}
      />

      <CatalogRealtimeRefresh />

      <main className="w-full max-w-none mx-auto px-4 py-12">
        <p className="text-destructive text-center">
          {result.error ?? "خطا"}
        </p>
      </main>
    </>
    );
  }

  const { data: products, total, page, totalPages } = result.data;
  const attrsProp = Object.keys(attrs).length ? attrs : undefined;

  return (
    <main className="w-full max-w-none mx-auto px-4 py-8 md:py-12">
      <JsonLd
        data={[
          brandPageSchema({
            name: brand.name,
            description: (brand as { description?: string | null }).description,
            slug,
            logo: (brand as { logo_url?: string | null }).logo_url ?? null,
          }),
          breadcrumbSchema([
            { name: "خانه", url: "/" },
            { name: "برچسبها", url: "/brands" },
            { name: brand.name, url: "/" + encodeURIComponent(slug) },
          ]),
        ]}
      />
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-iranyekan-heavy text-primary">{brand.name}</h1>
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
        brandSlug={slug}
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
            categorySlug={categorySlug}
            brandSlug={slug}
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
            brandSlug={slug}
            q={q}
            sort={sort}
            featured={featured}
            attrs={attrsProp}
            minPrice={
              minPrice && !Number.isNaN(minPrice) ? minPrice : undefined
            }
            maxPrice={
              maxPrice && !Number.isNaN(maxPrice) ? maxPrice : undefined
            }
          />
        </div>
      </div>

      {brand.description ? (
        <section className="border-border mt-12 border-t pt-8">
          <h2 className="mb-3 text-lg font-semibold text-primary">درباره {brand.name}</h2>
          <div className="text-muted-foreground prose prose-sm max-w-none leading-7 whitespace-pre-line">
            {brand.description}
          </div>
        </section>
      ) : null}
    </main>
  );
}
