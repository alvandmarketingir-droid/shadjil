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
  "origin",
] as const;

const SHIRT_FACETS = [...CORE_FACETS] as const;

const TIE_FACETS = ["weight", "nut-type", "origin", "weight-250", "weight-500"] as const;
const BOW_FACETS = ["weight", "nut-type", "origin", "weight-1kg"] as const;
const CUFF_FACETS = ["premium"] as const;

export const FACET_BY_CATEGORY: Record<string, string[]> = {
  shirts: [...SHIRT_FACETS],
  "dress-shirts": [...SHIRT_FACETS],
  "casual-shirts": [...SHIRT_FACETS],
  "linen-shirts": [...SHIRT_FACETS],
  "oxford-shirts": [...SHIRT_FACETS],
  overshirts: [...SHIRT_FACETS],
  ties: [...TIE_FACETS],
  "tie-clips": ["weight", "nut-type"],
  "bow-ties": [...BOW_FACETS],
  cufflinks: [...CUFF_FACETS],
  accessories: ["weight", "nut-type", "origin", "usage"],
  "pocket-squares": ["weight", "nut-type"],
  "formal-belts": ["weight", "nut-type"],
  "formal-socks": ["weight", "nut-type", "origin"],
};

export const DEFAULT_FACET_SLUGS = [...CORE_FACETS] as const;

export function facetSlugsForCategory(categorySlug?: string): string[] {
  if (!categorySlug) return [...DEFAULT_FACET_SLUGS];
  return FACET_BY_CATEGORY[categorySlug] ?? [...DEFAULT_FACET_SLUGS];
}
