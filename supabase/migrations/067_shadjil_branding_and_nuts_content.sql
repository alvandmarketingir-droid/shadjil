-- شادجیل: store branding + replace clothing-era FAQ/blog seed copy.
-- Idempotent upserts; safe on DBs that already applied earlier seeds.

-- Store display name
UPDATE site_settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{name}',
  to_jsonb('شادجیل'::text),
  true
),
updated_at = now()
WHERE key = 'store';

INSERT INTO site_settings (key, value, updated_at)
SELECT 'store', jsonb_build_object('name', 'شادجیل', 'currency', 'IRR'), now()
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'store');

-- FAQ items → nuts/packaging language
UPDATE site_settings
SET value = jsonb_build_object(
  'items',
  jsonb_build_array(
    jsonb_build_object(
      'q', 'چطور وزن بسته مناسب را انتخاب کنم؟',
      'a', 'روی صفحه هر محصول وزن‌های موجود مشخص است. اگر بین دو وزن مردد هستید از راهنمای بسته‌بندی استفاده کنید یا با پشتیبانی مشورت کنید.'
    ),
    jsonb_build_object(
      'q', 'زمان ارسال چقدر است؟',
      'a', 'پس از پرداخت معمولاً ۱ تا ۳ روز کاری آماده‌سازی سپس ارسال.'
    ),
    jsonb_build_object(
      'q', 'شرایط مرجوعی چیست؟',
      'a', 'کالای استفاده‌نشده با بسته‌بندی سالم طبق سیاست مرجوعی قابل بازگشت است.'
    ),
    jsonb_build_object(
      'q', 'پیگیری سفارش؟',
      'a', 'از داشبورد وضعیت و کد رهگیری را ببینید.'
    ),
    jsonb_build_object(
      'q', 'پرداخت چگونه است؟',
      'a', 'پس از آدرس و ارسال به مرحله پرداخت می‌روید.'
    ),
    jsonb_build_object(
      'q', 'تازگی و کیفیت محصول؟',
      'a', 'تلاش می‌کنیم آجیل و خشکبار تازه و با بسته‌بندی مناسب عرضه شود؛ در صورت مشکل پشتیبانی کمک می‌کند.'
    )
  )
),
updated_at = now()
WHERE key = 'page_faq';

-- Soft-unpublish clothing-era blog posts if still present
UPDATE blog_posts
SET status = 'draft',
    updated_at = now()
WHERE slug IN (
  'how-to-choose-shirt-size',
  'how-to-choose-shirt-weight',
  'dress-vs-casual-shirt'
)
AND COALESCE(status, '') <> 'draft';

UPDATE blog_categories
SET name = 'راهنمای خرید آجیل',
    description = 'نکات انتخاب آجیل، خشکبار، خرما و سوغات',
    updated_at = now()
WHERE slug = 'buying-guide';
