import Link from "next/link";
import { cn } from "@/lib/utils";

export type CategoryChip = {
  name: string;
  slug: string;
};

type Props = {
  categories: CategoryChip[];
  currentCategory?: string;
  brandSlug?: string;
  q?: string;
  sort?: string;
  featured?: boolean;
  attrs?: Record<string, string>;
};

function buildHref(
  categorySlug: string | undefined,
  props: Omit<Props, "categories" | "currentCategory">
) {
  const params = new URLSearchParams();
  if (categorySlug) params.set("category", categorySlug);
  if (props.brandSlug) params.set("brand", props.brandSlug);
  if (props.q) params.set("q", props.q);
  if (props.sort && props.sort !== "newest") params.set("sort", props.sort);
  if (props.featured) params.set("featured", "1");
  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (v) params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

export function ProductCategoryChips({
  categories,
  currentCategory,
  ...rest
}: Props) {
  if (!categories.length) return null;

  return (
    <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="text-muted-foreground shrink-0 text-sm">دسته:</span>
      <Link
        href={buildHref(undefined, rest)}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors",
          !currentCategory
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-background hover:bg-muted"
        )}
      >
        همه
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={buildHref(c.slug, rest)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors",
            currentCategory === c.slug
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          )}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
