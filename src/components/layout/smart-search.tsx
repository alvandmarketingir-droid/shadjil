"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, X, LayoutGrid, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriceRangeSlider06 } from "@/components/ui/price-range-slider-06";

type SuggestProduct = {
  name: string;
  slug: string;
  brand?: string | null;
  category?: string | null;
  image?: string | null;
  price?: number | null;
};
type SuggestItem = { name: string; slug: string };
type SuggestPost = { title: string; slug: string };
type FacetAttr = {
  id: string;
  name: string;
  slug: string;
  options: { id: string; value: string; slug: string }[];
};

const SORTS = [
  { value: "", label: "جدیدترین" },
  { value: "popular", label: "محبوب‌ترین" },
  { value: "price_asc", label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
];

const RECENT_KEY = "pm_recent_searches";
const RECENT_MAX = 8;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  try {
    const t = term.trim();
    if (t.length < 2) return;
    const prev = loadRecent().filter((x) => x !== t);
    localStorage.setItem(RECENT_KEY, JSON.stringify([t, ...prev].slice(0, RECENT_MAX)));
  } catch {}
}

export function SmartSearch({ className }: { className?: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SuggestProduct[]>([]);
  const [brands, setBrands] = useState<SuggestItem[]>([]);
  const [categories, setCategories] = useState<SuggestItem[]>([]);
  const [posts, setPosts] = useState<SuggestPost[]>([]);

  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [roast, setType] = useState("");
  const [weight, setWeight] = useState("");
  const [sort, setSort] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [facetCats, setFacetCats] = useState<SuggestItem[]>([]);
  const [facetBrands, setFacetBrands] = useState<SuggestItem[]>([]);
  const [facetTypes, setFacetTypes] = useState<SuggestItem[]>([]);
  const [facetWeights, setFacetWeights] = useState<SuggestItem[]>([]);
  const [facetAttrs, setFacetAttrs] = useState<FacetAttr[]>([]);
  const [attrSel, setAttrSel] = useState<Record<string, string>>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [facetsLoaded, setFacetsLoaded] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const activeFilters = useMemo(() => {
    let n = 0;
    if (category) n++;
    if (brand) n++;
    if (roast) n++;
    if (weight) n++;
    if (sort) n++;
    if (minPrice || maxPrice) n++;
    n += Object.keys(attrSel).length;
    return n;
  }, [category, brand, roast, weight, sort, minPrice, maxPrice, attrSel]);

  const hasSuggest =
    products.length > 0 ||
    brands.length > 0 ||
    categories.length > 0 ||
    posts.length > 0;

  const goResults = useCallback(
    (query?: string) => {
      const params = new URLSearchParams();
      const text = (query ?? q).trim();
      if (text) params.set("q", text);
      if (category) params.set("category", category);
      if (brand) params.set("brand", brand);
      if (roast) params.set("roast", roast);
      if (weight) params.set("weight", weight);
      if (sort) params.set("sort", sort);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      for (const [k, v] of Object.entries(attrSel)) {
        if (v) params.set(k, v);
      }
      const qs = params.toString();
      if (text) {
        pushRecent(text);
        setRecent(loadRecent());
        void fetch("/api/search/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, resultCount: -1, source: "submit" }),
        }).catch(() => {});
      }
      const hasFilter =
        Boolean(category || brand || roast || weight || sort || minPrice || maxPrice) ||
        Object.keys(attrSel).length > 0;
      if (text && !hasFilter) {
        router.push(`/search?q=${encodeURIComponent(text)}`);
      } else {
        router.push(qs ? `/products?${qs}` : "/products");
      }
      setSuggestOpen(false);
      setFilterOpen(false);
    },
    [q, category, brand, roast, weight, sort, minPrice, maxPrice, attrSel, router]
  );

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    goResults();
  }

  function clearFilters() {
    setCategory("");
    setBrand("");
    setType("");
    setWeight("");
    setSort("");
    setMinPrice("");
    setMaxPrice("");
    setAttrSel({});
  }

  function toggleAttr(slug: string, optSlug: string) {
    setAttrSel((prev) => {
      const next = { ...prev };
      if (next[slug] === optSlug) delete next[slug];
      else next[slug] = optSlug;
      return next;
    });
  }

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    if (!filterOpen || facetsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/search/facets");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFacetCats(data.categories ?? []);
        setFacetBrands(data.brands ?? []);
        setFacetTypes(data.roasts ?? []);
        setFacetWeights(data.weights ?? []);
        setFacetAttrs(data.attributes ?? []);
        setFacetsLoaded(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterOpen, facetsLoaded]);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setProducts([]);
      setBrands([]);
      setCategories([]);
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(text)}`
        );
        if (!res.ok) throw new Error("suggest failed");
        const data = await res.json();
        setProducts(data.products ?? []);
        setBrands(data.brands ?? []);
        setCategories(data.categories ?? []);
        setPosts(data.posts ?? []);
      } catch {
        setProducts([]);
        setBrands([]);
        setCategories([]);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setSuggestOpen(false);
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const chip = (active: boolean) =>
    cn(
      "rounded-xl border px-3 py-1.5 text-xs transition-colors",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border hover:bg-muted"
    );

  return (
    <div ref={rootRef} className={cn("relative flex h-10 w-full items-center", className)}>
      <form
        onSubmit={submit}
        className="border-border bg-background flex h-10 w-full items-center gap-0.5 rounded-xl border px-1"
      >
        <div className="flex min-w-0 flex-1 items-center">
          <Search className="text-muted-foreground mr-2 ml-2 h-4 w-4 shrink-0" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSuggestOpen(true);
              setFilterOpen(false);
            }}
            onFocus={() => {
              setRecent(loadRecent());
              setSuggestOpen(true);
            }}
            placeholder="جستجوی آجیل، خشکبار، خرما و سوغات..."
            className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
            dir="rtl"
            autoComplete="off"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSuggestOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground px-2"
              aria-label="پاک کردن"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setFilterOpen((v) => !v);
              setSuggestOpen(false);
            }}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1 rounded-lg border-r border-border px-2 text-xs",
              filterOpen || activeFilters
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
            aria-label="فیلترها"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">فیلتر</span>
            {activeFilters > 0 ? (
              <span className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]">
                {activeFilters}
              </span>
            ) : null}
          </button>
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground hidden h-8 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium sm:inline-flex"
        >
          جستجو
        </button>
      </form>

      {suggestOpen && (q.trim().length >= 2 || recent.length > 0) ? (
        <div className="border-border bg-card fixed inset-x-0 top-14 z-[120] max-h-[min(80vh,36rem)] overflow-y-auto rounded-none border-x-0 border-b border-t px-4 py-3 shadow-xl xl:top-16">
          {loading && !hasSuggest ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              در حال جستجو…
            </p>
          ) : null}
          {q.trim().length < 2 && recent.length > 0 ? (
            <div className="px-3 py-2">
              <p className="text-muted-foreground mb-1 text-[11px]">جستجوهای اخیر</p>
              <ul className="flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      className="border-border hover:bg-muted rounded-lg border px-2.5 py-1 text-xs"
                      onClick={() => {
                        setQ(r);
                        goResults(r);
                      }}
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!loading && q.trim().length >= 2 && !hasSuggest ? (
            <div className="text-muted-foreground space-y-3 px-4 py-6 text-center text-sm">
              <p>برای «{q.trim()}» نتیجه‌ای یافت نشد</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href="/products"
                  onClick={() => setSuggestOpen(false)}
                  className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-xs"
                >
                  همه محصولات
                </Link>
                <Link
                  href="/products?sort=popular"
                  onClick={() => setSuggestOpen(false)}
                  className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-xs"
                >
                  محبوب‌ترین‌ها
                </Link>
              </div>
            </div>
          ) : null}
          {products.length > 0 ? (
            <ul className="divide-border divide-y">
              {products.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/products/${p.slug}`}
                    onClick={() => setSuggestOpen(false)}
                    className="hover:bg-muted/60 flex items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="bg-muted relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <LayoutGrid className="text-muted-foreground h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      {p.price != null && p.price > 0 ? (
                        <span className="text-primary block text-sm font-bold">
                          {Number(p.price).toLocaleString("fa-IR")} تومان
                        </span>
                      ) : null}
                    </span>
                    {(p.brand || p.category) ? (
                      <span className="text-muted-foreground max-w-[9rem] shrink-0 truncate text-xs">
                        {[p.brand, p.category].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {categories.length > 0 ? (
            <div className="border-border border-t px-3 py-2">
              <p className="text-muted-foreground mb-1 text-[11px]">دسته‌بندی‌ها</p>
              <ul className="space-y-0.5">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/products?category=${encodeURIComponent(c.slug)}`}
                      onClick={() => setSuggestOpen(false)}
                      className="hover:bg-muted/60 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <Tag className="text-muted-foreground h-3.5 w-3.5" />
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {brands.length > 0 ? (
            <div className="border-border border-t px-3 py-2">
              <p className="text-muted-foreground mb-1 text-[11px]">برچسب‌ها</p>
              <ul className="space-y-0.5">
                {brands.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/brands/${b.slug}`}
                      onClick={() => setSuggestOpen(false)}
                      className="hover:bg-muted/60 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <Tag className="text-muted-foreground h-3.5 w-3.5" />
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {posts.length > 0 ? (
            <div className="border-border border-t px-3 py-2">
              <p className="text-muted-foreground mb-1 text-[11px]">مقالات</p>
              <ul className="space-y-0.5">
                {posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={"/blog/" + post.slug}
                      onClick={() => setSuggestOpen(false)}
                      className="hover:bg-muted/60 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <Tag className="text-muted-foreground h-3.5 w-3.5" />
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => goResults()}
            className="border-border text-primary hover:bg-muted/50 sticky bottom-0 w-full border-t bg-card px-4 py-3 text-center text-sm font-medium"
          >
            مشاهده همه نتایج جستجو
          </button>
        </div>
      ) : null}

      {filterOpen ? (
        <div className="border-border bg-card fixed inset-x-0 top-14 z-[120] max-h-[min(80vh,40rem)] overflow-y-auto rounded-none border-x-0 border-b border-t px-4 py-3 shadow-xl xl:top-16">
          <div className="mx-auto w-full max-w-6xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">فیلترها</span>
            <div className="flex items-center gap-2">
              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-muted-foreground text-xs hover:text-primary"
                >
                  پاک کردن
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-4 flex justify-start">
            <button
              type="button"
              onClick={() => goResults()}
              className="bg-primary text-primary-foreground h-10 w-full rounded-xl px-6 text-sm font-semibold shadow-sm sm:w-auto sm:min-w-[11rem]"
            >
              اعمال و جستجو
            </button>
          </div>


          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                مرتب‌سازی بر اساس
              </p>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((s) => (
                  <button
                    key={s.value || "newest"}
                    type="button"
                    onClick={() => setSort(s.value)}
                    className={chip(sort === s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                دسته‌بندی‌ها
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("")}
                  className={chip(!category)}
                >
                  همه
                </button>
                {facetCats.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() =>
                      setCategory(category === c.slug ? "" : c.slug)
                    }
                    className={chip(category === c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
                {!facetsLoaded ? (
                  <span className="text-muted-foreground text-xs">…</span>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                برچسب
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBrand("")}
                  className={chip(!brand)}
                >
                  همه
                </button>
                {facetBrands.map((b) => (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => setBrand(brand === b.slug ? "" : b.slug)}
                    className={chip(brand === b.slug)}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">بازه قیمت</p>
              <PriceRangeSlider06
                min={0}
                max={50_000_000}
                step={50_000}
                defaultValue={[
                  minPrice ? Number(minPrice) || 0 : 0,
                  maxPrice ? Number(maxPrice) || 50_000_000 : 50_000_000,
                ]}
                onValueChange={(range) => {
                  setMinPrice(range[0] > 0 ? String(range[0]) : "");
                  setMaxPrice(range[1] < 50_000_000 ? String(range[1]) : "");
                }}
              />
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                وضعیت محصول
              </p>
              <div className="flex flex-wrap gap-2">
                {facetTypes.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setType(roast === c.slug ? "" : c.slug)}
                    className={chip(roast === c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                وزن
              </p>
              <div className="flex flex-wrap gap-2">
                {facetWeights.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => setWeight(weight === s.slug ? "" : s.slug)}
                    className={chip(weight === s.slug)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {facetAttrs.length > 0 ? (
              <div className="border-border border-t pt-3">
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className="hover:bg-muted flex w-full items-center justify-between rounded-md px-1 py-2 text-xs font-medium"
                >
                  <span className="flex items-center gap-2">
                    فیلترهای بیشتر
                    {Object.keys(attrSel).length > 0 ? (
                      <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                        {Object.keys(attrSel).length}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {moreOpen ? "بستن" : "باز کردن"}
                  </span>
                </button>
                {moreOpen ? (
                  <div className="mt-3 space-y-4">
                    {facetAttrs.map((attr) => (
                      <div key={attr.id}>
                        <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                          {attr.name}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {attr.options.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleAttr(attr.slug, opt.slug)}
                              className={chip(attrSel[attr.slug] === opt.slug)}
                            >
                              {opt.value}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}
