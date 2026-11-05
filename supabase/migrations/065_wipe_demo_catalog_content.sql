-- Wipe demo/test catalog + blog rows from migrations 020 / 053.
-- Safe: does NOT drop tables, shipping seeds, or profiles.
-- Owner: apply on prod when ready for empty shop (or use scripts/wipe-demo-content.mjs).

BEGIN;

-- Order/cart lines for demo product variants
DELETE FROM public.cart_items
WHERE variant_id IN (
  SELECT pv.id FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE p.slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.order_items
WHERE variant_id IN (
  SELECT pv.id FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE p.slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.product_attribute_values
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.product_images
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.product_tag_map
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.reviews
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.wishlists
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.stock_alerts
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.product_variants
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN (
    'classic-blue-dress-shirt',
    'black-slim-fit-dress-shirt',
    'cream-oxford-casual-shirt',
    'navy-silk-tie',
    'matte-black-bow-tie',
    'silver-round-cufflinks',
    'white-slim-fit-dress-shirt'
  )
);

DELETE FROM public.products
WHERE slug IN (
  'classic-blue-dress-shirt',
  'black-slim-fit-dress-shirt',
  'cream-oxford-casual-shirt',
  'navy-silk-tie',
  'matte-black-bow-tie',
  'silver-round-cufflinks',
  'white-slim-fit-dress-shirt'
);

-- Demo blog from 053
DELETE FROM public.blog_tag_map
WHERE post_id IN (
  SELECT id FROM public.blog_posts WHERE slug IN (
    'how-to-choose-shirt-size',
    'dress-vs-casual-shirt'
  )
);

DELETE FROM public.blog_posts
WHERE slug IN (
  'how-to-choose-shirt-size',
  'dress-vs-casual-shirt'
);

DELETE FROM public.blog_categories
WHERE slug = 'buying-guide';

COMMIT;
