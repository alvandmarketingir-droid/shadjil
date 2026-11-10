import { RelatedStrip } from "@/components/shop/related-strip";
import { getRelatedProducts } from "@/lib/related-products";
import type { Metadata } from "next";
// ISR: HTML کامل سرور-ساید، کش ۶۰ ثانیه — ظاهر و عملکرد دست‌نخورده
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCachedProductBySlug } from "@/lib/cache/product";
import { Badge } from "@/components/ui/badge";
import { TrackRecentlyViewed } from "@/components/product/track-recently-viewed";
import { ProductReviews } from "@/components/shop/product-reviews";
import { PriceHistory } from "@/components/product/price-history";
import { ProductPdpGalleryAndBuy } from "@/components/product/product-pdp-media";
import { ProductSpecs } from "@/components/product/product-specs";
import { getProductSpecRows } from "@/lib/product-specs";
import { getProductPriceHistory, averageVariantPrice } from "@/lib/price-history";
import { resolveColorHex } from "@/lib/colors";
import { loadSizeGuideForProduct } from "@/lib/weight-guide/load";
import { SizeGuideSnippet } from "@/components/product/weight-guide-snippet";
import { normalizeProductSlug } from "@/lib/product-slug";
import { JsonLd } from "@/components/seo/json-ld";
import { productSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { applySeoTemplate } from "@/lib/seo/template";
import { isSiteIndexable, SITE_URL } from "@/lib/seo/indexing";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

function _formatPrice(_p: number) { return null; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeProductSlug(rawSlug);
  const result = await getCachedProductBySlug(slug);

  if (!result.success || !result.data) {
    return { title: "محصول یافت نشد" };
  }

  const p = result.data as typeof result.data & {
    meta_title?: string | null;
    meta_description?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image_url?: string | null;
    robots_index?: boolean | null;
    robots_follow?: boolean | null;
    canonical_url?: string | null;
  };
  const tplCtx = {
    name: p.name,
    title: p.name,
    slug: p.slug,
    category: (p as { category?: { name?: string } | null }).category?.name,
    brand: (p as { brand?: { name?: string } | null }).brand?.name,
    description: p.short_description || undefined,
  };
  const title = applySeoTemplate(p.meta_title, tplCtx) || p.name;
  const description =
    applySeoTemplate(p.meta_description, tplCtx) ||
    p.short_description ||
    undefined;
  const allow = isSiteIndexable();
  const canonical =
    p.canonical_url || `${SITE_URL}/products/${p.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: allow && p.robots_index !== false,
      follow: allow && p.robots_follow !== false,
    },
    openGraph: {
      title: p.og_title || title,
      description: p.og_description || description,
      url: canonical,
      images: p.og_image_url ? [{ url: p.og_image_url }] : undefined,
      locale: "fa_IR",
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = normalizeProductSlug(rawSlug);
  const result = await getCachedProductBySlug(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const product = result.data;
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "");
  const weightGuide = await loadSizeGuideForProduct({
    weightGuideId: (product as { weight_guide_id?: string | null }).weight_guide_id,
    categoryId: (product as { category_id?: string | null }).category_id,
  });
  const images = product.images ?? [];
  const primaryImage =
    images.find((img) => img.is_primary) ?? images[0] ?? null;
  const activeVariants =
    product.variants?.filter((v) => v.is_active) ?? [];
  const minPrice =
    activeVariants.length > 0
      ? Math.min(...activeVariants.map((v) => Number(v.price)))
      : null;
  const _weights = [
    ...new Set(
      activeVariants
        .map((v) => {
          const s = (v as { weight?: string | { name?: string | null } | null }).weight;
          if (typeof s === "string" && s) return s;
          if (s && typeof s === "object" && s.name) return s.name;
          return null;
        })
        .filter((s): s is string => Boolean(s))
    ),
  ];
  const _roasts = [
    ...new Map(
      activeVariants
        .map((v) => {
          const c = (v as {
            roast_name?: string | null;
            roast_hex?: string | null;
            roast?: string | { name?: string | null; hex_code?: string | null; hex?: string | null } | null;
          });
          if (c.roast_name) return [c.roast_name, c.roast_hex ?? null] as const;
          if (typeof c.roast === "string" && c.roast) return [c.roast, null] as const;
          if (c.roast && typeof c.roast === "object") {
            const name = c.roast.name ?? c.roast.hex_code ?? c.roast.hex ?? null;
            const hex = c.roast.hex_code ?? c.roast.hex ?? null;
            if (name) return [name, hex] as const;
          }
          return null;
        })
        .filter((x): x is readonly [string, string | null] => Boolean(x))
        .map((x) => [x[0], x[1]] as [string, string | null])
    ).entries(),
  ];


  const variantOptions = activeVariants.map((v) => {
    const s = (v as { weight?: string | { name?: string | null } | null }).weight;
    const weightName =
      typeof s === "string" ? s : s && typeof s === "object" ? s.name ?? null : null;
    const c = (v as {
      roast?: string | { name?: string | null; hex_code?: string | null; hex?: string | null } | null;
      roast_hex?: string | null;
      roast_name?: string | null;
    });
    const nameHint =
      (c.roast_name || "").trim() ||
      (typeof c.roast === "string" ? c.roast : c.roast?.name || "") ||
      "";
    let roastVal: string | null = resolveColorHex(
      nameHint || c.roast_hex,
      c.roast_hex ||
        (c.roast && typeof c.roast === "object"
          ? c.roast.hex_code ?? c.roast.hex
          : null),
    );
    if (!roastVal && c.roast && typeof c.roast === "object") {
      roastVal = c.roast.hex_code ?? c.roast.hex ?? c.roast.name ?? null;
    } else if (typeof c.roast === "string") {
      roastVal = c.roast;
    }
    const op = Number((v as { original_price?: number | null }).original_price ?? 0);
    const pr = Number((v as { price?: number }).price ?? 0);
    return {
      id: (v as { id: string }).id,
      weight: weightName,
      roast: roastVal,
      price: pr,
      original_price: op > pr && op > 0 ? op : null,
      stock: Number((v as { stock_quantity?: number }).stock_quantity ?? 0),
    };
  });

    const relatedProducts = await getRelatedProducts(
    product.id,
    product.category_id ?? product.category?.id ?? null,
    8,
  );
  const priceHistoryRaw = await getProductPriceHistory(String(product.id), 40);
  // میانگین از همه واریانت‌هایی که قیمت معتبر دارند (حتی اگر is_active null باشد)
  const variantsForAvg = (product.variants ?? []).filter(
    (v) => (v as { is_active?: boolean | null }).is_active !== false,
  );
  let currentAvg = averageVariantPrice(
    variantsForAvg.map((v) => ({
      price: Number((v as { price?: number }).price ?? 0),
      original_price:
        Number((v as { original_price?: number | null }).original_price ?? 0) ||
        null,
      is_active: (v as { is_active?: boolean | null }).is_active !== false,
    })),
  );
  // fallback: از variantOptions که روی صفحه برای خرید استفاده می‌شود
  if (currentAvg == null && variantOptions.length) {
    const ops = variantOptions
      .map((v) => Number(v.price))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (ops.length) currentAvg = ops.reduce((a, b) => a + b, 0) / ops.length;
  }
  const priceHistory =
    currentAvg != null
      ? [
          ...priceHistoryRaw.filter((p) => p.price > 0),
          {
            price: currentAvg,
            recorded_at: new Date().toISOString(),
          },
        ]
      : priceHistoryRaw.filter((p) => p.price > 0);
  const specRows = await getProductSpecRows(String(product.id));

  return (
    <main className="w-full max-w-none mx-auto px-4 py-8 md:py-12">

<ProductPdpGalleryAndBuy
        childrenBelowGallery={
          <div className="mt-6 md:mt-5">
            <PriceHistory points={priceHistory} />
          </div>
        }
        productId={product.id}
        productName={product.name}
        href={`/products/${product.slug}`}
        fallbackImage={primaryImage?.url}
        images={(images ?? [])
          .slice()
          .sort((a, b) => {
            const ap = a.is_primary ? 0 : 1;
            const bp = b.is_primary ? 0 : 1;
            if (ap !== bp) return ap - bp;
            return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
          })
          .map((img) => ({
            url: img.url,
            alt: img.alt_text ?? product.name,
            is_primary: !!img.is_primary,
            variant_id: (img as { variant_id?: string | null }).variant_id ?? null,
          }))}
        variants={variantOptions}
        childrenTitle={
          <>
            <h1 className="text-2xl md:text-3xl font-iranyekan-heavy text-primary">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              {product.is_new ? (
                <Badge className="inline-flex h-6 items-center border-0 bg-emerald-100 px-2.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  جدید
                </Badge>
              ) : null}
              {product.is_featured ? (
                <Badge className="inline-flex h-6 items-center border-0 bg-amber-100 px-2.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  شگفت‌انگیز
                </Badge>
              ) : null}
              {product.category?.slug ? (
                <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="no-underline hover:no-underline hover:opacity-100">
                  <Badge className="inline-flex h-6 items-center border-0 bg-sky-100 px-2.5 text-xs text-sky-800 shadow-none transition-none hover:bg-sky-100 hover:text-sky-800 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/40 dark:hover:text-sky-200">
                    {product.category.name}
                  </Badge>
                </Link>
              ) : null}
              {product.brand?.slug ? (
                <Link href={`/brands/${product.brand.slug}`} className="no-underline hover:no-underline hover:opacity-100">
                  <Badge className="inline-flex h-6 items-center border-0 bg-violet-100 px-2.5 text-xs text-violet-800 shadow-none transition-none hover:bg-violet-100 hover:text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 dark:hover:bg-violet-900/40 dark:hover:text-violet-200">
                    {product.brand.name}
                  </Badge>
                </Link>
              ) : null}
            </div>
          </>
        }
        childrenBeforeBuy={
          <>
            {product.short_description ? (
              <div className="border-border rounded-xl border bg-muted/30 p-4">
                <p className="mb-1 text-sm font-medium text-primary">خلاصه محصول</p>
                <p className="text-muted-foreground text-sm leading-7">
                  {product.short_description}
                </p>
              </div>
            ) : null}

            
      <JsonLd
        data={[
          productSchema({
            name: product.name,
            slug: product.slug,
            description: product.short_description || product.description,
            images: (product.images ?? []).map((im: { url: string }) => im.url).filter(Boolean),
            brandName: (product as { brand?: { name?: string } | null }).brand?.name ?? null,
            categoryName: (product as { category?: { name?: string } | null }).category?.name ?? null,
            price: minPrice,
            availability:
              activeVariants.some((v: { stock_quantity?: number | null }) => Number(v.stock_quantity ?? 0) > 0)
                ? "InStock"
                : "OutOfStock",
          }),
          breadcrumbSchema([
            { name: "خانه", url: siteBase + "/" },
            { name: "محصولات", url: siteBase + "/products" },
            {
              name: (product as { category?: { name?: string } | null }).category?.name || "دسته",
              url:
                siteBase +
                "/categories/" +
                ((product as { category?: { slug?: string } | null }).category?.slug || ""),
            },
            { name: product.name, url: siteBase + "/products/" + product.slug },
          ]),
        ]}
      />

      <TrackRecentlyViewed
              id={String(product.id)}
              title={String(product.name ?? "")}
              price={Number((product as { price?: number }).price ?? 0)}
              image={primaryImage?.url}
              href={`/products/${product.slug}`}
            />
          </>
        }
        childrenSpecs={
          specRows.length > 0 ? <ProductSpecs rows={specRows} compact /> : null
        }
        childrenAfterBuy={
          <>
            <div className="pdp-desktop-after-buy hidden lg:block space-y-4">
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <SizeGuideSnippet guide={weightGuide} />
                </div>
                <div>
                  <Link href="/shipping" className="text-muted-foreground font-medium underline-offset-4 hover:underline">
                    شرایط ارسال
                  </Link>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    هزینه و زمان ارسال به شهر شما
                  </p>
                </div>
                <div>
                  <Link href="/returns" className="text-muted-foreground font-medium underline-offset-4 hover:underline">
                    مرجوعی
                  </Link>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    تعویض و بازگشت تا ۷ روز کاری
                  </p>
                </div>
              </div>

            {product.description ? (
              <section className="mt-6 border-t pt-6" aria-label="توضیحات محصول">
                <h2 className="mb-3 text-lg font-semibold text-primary md:text-xl">توضیحات</h2>
                <div className="text-muted-foreground text-sm leading-7 whitespace-pre-line md:text-base">
                  {product.description}
                </div>
              </section>
            ) : null}
            </div>
          </>
        }
      />


      {/* موبایل/تبلت: لینک‌های اعتماد — دسکتاپ مخفی (خلاصه قبل از Buy Box آمده) */}
      <div className="mt-6 space-y-4 lg:hidden">
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div>
            <SizeGuideSnippet guide={weightGuide} />
          </div>
          <div>
            <Link href="/shipping" className="text-muted-foreground font-medium underline-offset-4 hover:underline">
              شرایط ارسال
            </Link>
            <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
              هزینه و زمان ارسال به شهر شما
            </p>
          </div>
          <div>
            <Link href="/returns" className="text-muted-foreground font-medium underline-offset-4 hover:underline">
              مرجوعی
            </Link>
            <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
              تعویض و بازگشت تا ۷ روز کاری
            </p>
          </div>
        </div>

            {product.description ? (
              <section className="mt-6 border-t pt-6" aria-label="توضیحات محصول">
                <h2 className="mb-3 text-lg font-semibold text-primary md:text-xl">توضیحات</h2>
                <div className="text-muted-foreground text-sm leading-7 whitespace-pre-line md:text-base">
                  {product.description}
                </div>
              </section>
            ) : null}
      </div>




      {relatedProducts?.length ? (
        <div className="mt-12 w-full max-w-none">
          <RelatedStrip
            title="محصولات مرتبط"
            items={relatedProducts.map((p) => ({
              title: String(
                (p as { name?: string; title?: string }).name ??
                  (p as { title?: string }).title ??
                  "",
              ),
              href: `/products/${(p as { slug: string }).slug}`,
              image:
                (p as { image_url?: string; primary_image_url?: string })
                  .image_url ??
                (p as { primary_image_url?: string }).primary_image_url ??
                undefined,
              price: (p as { price?: number | null }).price ?? null,
            }))}
          />
        </div>
      ) : null}

      <div className="mt-12 w-full max-w-none">
        <ProductReviews productId={product.id} />
      </div>
    </main>
  );
}
