import type { Metadata } from "next";
import Link from "next/link";
import { BrandService } from "@/services/brand.service";
import { CatalogRealtimeRefresh } from "@/components/shop/catalog-realtime-refresh";
import { EmptyBlock } from "@/components/ui/ui-state-blocks";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "برچسبها",
  description: "همه برچسبهای فروشگاه تخصصی شادجیل",
};

export default async function BrandsIndexPage() {
  const service = new BrandService();
  const result = await service.getActive();
  const brands = result.success && result.data ? result.data : [];

  return (
    <>
      <CatalogRealtimeRefresh />
      <main className="w-full max-w-none mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-iranyekan-heavy text-primary">
            برچسبها
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            انتخاب برچسب برای مشاهده محصولات
          </p>
        </div>

        {brands.length === 0 ? (
          <EmptyBlock
            title="برچسبی ثبت نشده"
            description="به‌زودی برچسبها اینجا نمایش داده می‌شوند."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/brands/${b.slug}`}
                className="bg-card hover:border-foreground/20 flex h-24 items-center justify-center rounded-2xl border px-3 text-center text-sm font-medium transition-roasts hover:bg-muted/40"
              >
                {b.name}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
