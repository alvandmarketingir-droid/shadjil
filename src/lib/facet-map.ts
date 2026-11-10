/** facetهای مجاز بر اساس slug دسته — هم‌تراز با attributes.slug در ادمین مشخصات */
const CORE_FACETS = [
  "weight",
  "nut-type",
  "origin",
  "pack-weight",
  "packaging",
  "grade",
  "roast-type",
  "salted",
  "quality",
  "organic",
  "raw",
  "gift-box",
  "usage",
] as const;

const NUTS_FACETS = [...CORE_FACETS] as const;
const DRIED_FACETS = [
  "weight",
  "nut-type",
  "origin",
  "pack-weight",
  "packaging",
  "grade",
  "organic",
  "quality",
] as const;
const DATES_FACETS = [
  "weight",
  "origin",
  "pack-weight",
  "packaging",
  "grade",
  "organic",
] as const;
const SOUVENIR_FACETS = ["weight", "origin", "gift-box", "usage", "premium"] as const;

export const FACET_BY_CATEGORY: Record<string, string[]> = {
  // آجیل
  ajil: [...NUTS_FACETS],
  nuts: [...NUTS_FACETS],
  pistachio: [...NUTS_FACETS],
  almond: [...NUTS_FACETS],
  cashew: [...NUTS_FACETS],
  hazelnut: [...NUTS_FACETS],
  walnut: [...NUTS_FACETS],
  // خشکبار
  khoshkbar: [...DRIED_FACETS],
  "dried-fruit": [...DRIED_FACETS],
  raisins: [...DRIED_FACETS],
  figs: [...DRIED_FACETS],
  // خرما
  khorma: [...DATES_FACETS],
  dates: [...DATES_FACETS],
  // سوغات / هدیه
  soghat: [...SOUVENIR_FACETS],
  souvenirs: [...SOUVENIR_FACETS],
  gifts: [...SOUVENIR_FACETS],
  accessories: [...SOUVENIR_FACETS],
};

export const DEFAULT_FACET_SLUGS = [...CORE_FACETS] as const;

export function facetSlugsForCategory(categorySlug?: string): string[] {
  if (!categorySlug) return [...DEFAULT_FACET_SLUGS];
  return FACET_BY_CATEGORY[categorySlug] ?? [...DEFAULT_FACET_SLUGS];
}
