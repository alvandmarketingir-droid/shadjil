"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { AttributeWithOptions } from "@/repositories/attribute.repository";
import { Check } from "lucide-react";
import { PriceRangeSlider06 } from "@/components/ui/price-range-slider-06";

export type CategoryChip = { name: string; slug: string };

type Props = {
  facets: AttributeWithOptions[];
  current: Record<string, string>;
  categories?: CategoryChip[];
  categorySlug?: string;
  brandSlug?: string;
  q?: string;
  sort?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  roasts?: { id: string; name: string; slug: string; hex?: string | null }[];
  weights?: { id: string; name: string; slug: string }[];
  roastSlug?: string;
  weightSlug?: string;
  forceVisible?: boolean;
};

const SORTS = [
  { value: "newest", label: "جدیدترین" },
  { value: "featured", label: "شگفت‌انگیز" },
  { value: "popular", label: "محبوب‌ترین" },
  { value: "price_asc", label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
] as const;

function buildHref(
  next: {
    category?: string | null;
    sort?: string | null;
    attrs?: Record<string, string>;
    minPrice?: number | null;
    maxPrice?: number | null;
    roast?: string | null;
    weight?: string | null;
  },
  base: Props
) {
  const params = new URLSearchParams();
  if (base.brandSlug) params.set("brand", base.brandSlug);
  if (base.q) params.set("q", base.q);

  const roast =
    (next as { roast?: string | null }).roast === null
      ? undefined
      : (next as { roast?: string | null }).roast !== undefined
        ? (next as { roast?: string | null }).roast ?? undefined
        : base.roastSlug;
  if (roast) params.set("roast", roast);

  const weight =
    (next as { weight?: string | null }).weight === null
      ? undefined
      : (next as { weight?: string | null }).weight !== undefined
        ? (next as { weight?: string | null }).weight ?? undefined
        : base.weightSlug;
  if (weight) params.set("weight", weight);

  const wantFeatured =
    next.sort === "featured"
      ? true
      : next.sort != null && next.sort !== "featured"
        ? false
        : !!base.featured;
  if (wantFeatured) params.set("featured", "1");

  const cat =
    next.category === null
      ? undefined
      : next.category !== undefined
        ? next.category
        : base.categorySlug;
  if (cat) params.set("category", cat);

  let sort =
    next.sort === null
      ? "newest"
      : next.sort !== undefined
        ? next.sort
        : base.sort ?? "newest";
  if (sort === "featured") sort = "newest";
  if (sort && sort !== "newest") params.set("sort", sort);

  const attrs = next.attrs !== undefined ? next.attrs : base.current;
  for (const [k, v] of Object.entries(attrs)) {
    if (v) params.set(k, v);
  }

  const minP =
    next.minPrice === null
      ? undefined
      : next.minPrice !== undefined
        ? next.minPrice
        : base.minPrice;
  const maxP =
    next.maxPrice === null
      ? undefined
      : next.maxPrice !== undefined
        ? next.maxPrice
        : base.maxPrice;
  if (minP != null && minP > 0) params.set("minPrice", String(minP));
  if (maxP != null && maxP > 0) params.set("maxPrice", String(maxP));

  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

function FilterLink({
  href,
  active,
  children,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onNavigate: (href: string) => void;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(href);
      }}
      className={cn(
        "flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs transition-roasts",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-muted"
      )}
    >
      {children}
    </a>
  );
}

function CheckBox({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-roasts",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/40"
      )}
    >
      {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-roasts",
        active ? "border-primary bg-primary" : "border-muted-foreground/40"
      )}
    >
      {active ? (
        <span className="bg-primary-foreground block h-1.5 w-1.5 rounded-full" />
      ) : null}
    </span>
  );
}

export function ProductFiltersSidebar(props: Props) {
  const {
    facets,
    current,
    categories = [],
    categorySlug,
    sort = "newest",
    featured,
    minPrice,
    maxPrice,
    forceVisible,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  /** key گزینه‌ای که کاربر همین الان زده — تا تیک فوری باشد */
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(() => Object.keys(props.current ?? {}).length > 0);

  // وقتی URL واقعی عوض شد، optimistic را پاک کن
  useEffect(() => {
    setPendingKey(null);
  }, [pathname, searchParams]);

  function navigate(href: string, key: string) {
    setPendingKey(key);
    startTransition(() => {
      router.push(href);
    });
  }

  function isActive(key: string, serverActive: boolean) {
    if (pendingKey === key) return true;
    // اگر چیز دیگری pending است، server state همان گزینه را خاموش نشان بده
    if (pendingKey && pendingKey !== key) {
      // برای radioهای sort/category: فقط pending روشن
      if (pendingKey.startsWith("sort:") || pendingKey.startsWith("cat:")) {
        if (key.startsWith("sort:") || key.startsWith("cat:")) return false;
      }
    }
    return !pendingKey ? serverActive : serverActive && !pendingKey.startsWith(key.split(":")[0] + ":");
  }

  // ساده‌تر و قابل اعتمادتر برای تیک فوری:
  function optActive(key: string, serverActive: boolean) {
    if (pendingKey === key) return true;
    if (pendingKey?.startsWith("attr:") && key.startsWith("attr:")) {
      const pendingAttr = pendingKey.split(":")[1];
      const thisAttr = key.split(":")[1];
      if (pendingAttr === thisAttr) return pendingKey === key;
    }
    if (pendingKey?.startsWith("sort:") && key.startsWith("sort:")) {
      return pendingKey === key;
    }
    if (pendingKey?.startsWith("cat:") && key.startsWith("cat:")) {
      return pendingKey === key;
    }
    return serverActive;
  }

  const clearAll = buildHref(
    { category: null, sort: null, attrs: {}, minPrice: null, maxPrice: null },
    { ...props, featured: false }
  );

  const activeCount =
    (categorySlug ? 1 : 0) +
    (featured ? 1 : 0) +
    (sort && sort !== "newest" ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    Object.keys(current).length;

  return (
    <aside
      className={cn(
        forceVisible
          ? "w-full space-y-1"
          : "border-border bg-card hidden w-64 shrink-0 self-start rounded-xl border p-4 lg:sticky lg:top-24 lg:block",
        isPending && "opacity-90"
      )}
    >
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <h2 className="text-sm font-semibold text-primary">
          فیلترها
          {isPending ? (
            <span className="text-muted-foreground ms-2 text-[10px] font-normal">
              …
            </span>
          ) : null}
        </h2>
        {activeCount > 0 ? (
          <button
            type="button"
            className="text-primary text-xs hover:underline"
            onClick={() => navigate(clearAll, "clear")}
          >
            حذف فیلترها
          </button>
        ) : null}
      </div>

      <div
        className={
          forceVisible
            ? "space-y-5"
            : "max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto pe-1"
        }
      >
        {categories.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium">دسته‌بندی‌ها</p>
            <ul className="space-y-0.5">
              <li>
                <FilterLink
                  href={buildHref({ category: null }, props)}
                  active={optActive("cat:all", !categorySlug)}
                  onNavigate={(h) => navigate(h, "cat:all")}
                >
                  <CheckBox active={optActive("cat:all", !categorySlug)} />
                  همه
                </FilterLink>
              </li>
              {categories.map((c) => {
                const server = categorySlug === c.slug;
                const key = `cat:${c.slug}`;
                const href = buildHref(
                  { category: server ? null : c.slug },
                  props
                );
                return (
                  <li key={c.slug}>
                    <FilterLink
                      href={href}
                      active={optActive(key, server)}
                      onNavigate={(h) => navigate(h, key)}
                    >
                      <CheckBox active={optActive(key, server)} />
                      {c.name}
                    </FilterLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium">مرتب‌سازی بر اساس</p>
          <ul className="space-y-0.5">
            {SORTS.map((s) => {
              const server =
                s.value === "featured"
                  ? !!featured
                  : !featured && (sort ?? "newest") === s.value;
              const key = `sort:${s.value}`;
              const href = buildHref({ sort: s.value }, props);
              return (
                <li key={s.value}>
                  <FilterLink
                    href={href}
                    active={optActive(key, server)}
                    onNavigate={(h) => navigate(h, key)}
                  >
                    <RadioDot active={optActive(key, server)} />
                    {s.label}
                  </FilterLink>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium">بازه قیمت</p>
          <PriceRangeSlider06
            min={0}
            max={50_000_000}
            step={50_000}
            defaultValue={[minPrice && minPrice > 0 ? minPrice : 0, maxPrice && maxPrice > 0 ? maxPrice : 50_000_000]}
            onValueChange={(range) => {
              const href = buildHref(
                {
                  minPrice: range[0] > 0 ? range[0] : null,
                  maxPrice: range[1] < 50_000_000 ? range[1] : null,
                },
                props
              );
              navigate(href, "price");
            }}
          />
        </div>

        {/* —— وضعیت محصول —— */}
        {(props.roasts?.length ?? 0) > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium">وضعیت محصول</p>
            <ul className="space-y-0.5">
              {props.roasts!.map((c) => {
                const server = props.roastSlug === c.slug;
                const key = `roast:${c.slug}`;
                const href = buildHref(
                  { roast: server ? null : c.slug },
                  props
                );
                return (
                  <li key={c.id}>
                    <FilterLink
                      href={href}
                      active={optActive(key, server)}
                      onNavigate={(h) => navigate(h, key)}
                    >
                      <CheckBox active={optActive(key, server)} />
                      {c.hex ? (
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundType: c.hex }}
                        />
                      ) : null}
                      <span className="leading-snug">{c.name}</span>
                    </FilterLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* —— مناسبت‌ها —— */}
        {(props.weights?.length ?? 0) > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium">موجودی</p>
            <ul className="space-y-0.5">
              {props.weights!.map((s) => {
                const server = props.weightSlug === s.slug;
                const key = `weight:${s.slug}`;
                const href = buildHref(
                  { weight: server ? null : s.slug },
                  props
                );
                return (
                  <li key={s.id}>
                    <FilterLink
                      href={href}
                      active={optActive(key, server)}
                      onNavigate={(h) => navigate(h, key)}
                    >
                      <CheckBox active={optActive(key, server)} />
                      <span className="leading-snug">{s.name}</span>
                    </FilterLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* —— فیلترهای بیشتر (جنس پارچه و بقیه ویژگی‌ها) —— */}
        {facets.length > 0 ? (
          <div className="border-border border-t pt-3">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="hover:bg-muted flex w-full items-center justify-between rounded-md px-1 py-2 text-xs font-medium"
            >
              <span className="flex items-center gap-2">
                فیلترهای بیشتر
                {Object.keys(current).length > 0 ? (
                  <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                    {Object.keys(current).length}
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {moreOpen ? "بستن" : "باز کردن"}
              </span>
            </button>
            {moreOpen ? (
              <div className="mt-3 space-y-5">
        {facets.map((attr) => (
          <div key={attr.id}>
            <p className="mb-2 text-xs font-medium">{attr.name}</p>
            <ul className="space-y-0.5">
              {attr.options.map((opt) => {
                const server = current[attr.slug] === opt.slug;
                const key = `attr:${attr.slug}:${opt.slug}`;
                const nextAttrs = { ...current };
                if (server) delete nextAttrs[attr.slug];
                else nextAttrs[attr.slug] = opt.slug;
                const href = buildHref({ attrs: nextAttrs }, props);
                return (
                  <li key={opt.id}>
                    <FilterLink
                      href={href}
                      active={optActive(key, server)}
                      onNavigate={(h) => navigate(h, key)}
                    >
                      <CheckBox active={optActive(key, server)} />
                      <span className="leading-snug">{opt.value}</span>
                    </FilterLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
              </div>
            ) : null}
          </div>
        ) : null}

      </div>
    </aside>
  );
}
