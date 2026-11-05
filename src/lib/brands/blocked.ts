/**
 * Brands permanently excluded from storefront UI (name / slug / logo).
 * Tommy Hilfiger shows a broken card — hide entirely until a real asset exists.
 */
const BLOCKED_NEEDLES = [
  "tommy",
  "hilfiger",
  "تامی",
  "هیلفیگر",
  "tommy-hilfiger",
  "تامی-هیلفیگر",
] as const;

export function isBlockedBrand(input: {
  name?: string | null;
  slug?: string | null;
  logo_url?: string | null;
}): boolean {
  const hay = `${input.name ?? ""} ${input.slug ?? ""} ${input.logo_url ?? ""}`
    .toLowerCase()
    .trim();
  if (!hay) return false;
  return BLOCKED_NEEDLES.some((n) => hay.includes(n.toLowerCase()));
}

export function filterBlockedBrands<T extends { name?: string | null; slug?: string | null; logo_url?: string | null }>(
  brands: T[],
): T[] {
  return brands.filter((b) => !isBlockedBrand(b));
}
