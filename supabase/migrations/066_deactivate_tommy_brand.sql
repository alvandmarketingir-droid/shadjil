-- Soft-hide Tommy Hilfiger from storefront (broken logo / unwanted brand card).
-- Does not delete products; only sets brands.is_active = false for matching rows.

UPDATE public.brands
SET is_active = false,
    updated_at = now()
WHERE is_active IS DISTINCT FROM false
  AND (
    lower(coalesce(name, '')) ~ 'tommy|hilfiger|تامی|هیلفیگر'
    OR lower(coalesce(slug, '')) ~ 'tommy|hilfiger|تامی|هیلفیگر'
    OR coalesce(logo_url, '') ILIKE '%tommy%'
  );
