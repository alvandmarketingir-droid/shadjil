import Link from "next/link";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "newest", label: "جدیدترین" },
  { value: "popular", label: "محبوب‌ترین" },
  { value: "price_asc", label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
] as const;

type Props = {
  currentSort?: string;
  categorySlug?: string;
  brandSlug?: string;
  q?: string;
  featured?: boolean;
  attrs?: Record<string, string>;
};

function buildHref(sort: string, props: Omit<Props, "currentSort">) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  if (props.categorySlug) params.set("category", props.categorySlug);
  if (props.brandSlug) params.set("brand", props.brandSlug);
  if (props.q) params.set("q", props.q);
  if (props.featured) params.set("featured", "1");
  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (v) params.set(k, v);
    }
  }
  return `/products?${params.toString()}`;
}

export function ProductSortBar(props: Props) {
  const current = props.currentSort ?? "newest";

  return (
    <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="text-muted-foreground shrink-0 text-sm">مرتب‌سازی بر اساس:</span>
      {SORTS.map((s) => (
        <Link
          key={s.value}
          href={buildHref(s.value, props)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-roasts",
            current === s.value
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          )}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
