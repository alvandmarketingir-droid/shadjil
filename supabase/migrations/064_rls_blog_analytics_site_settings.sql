-- 064: RLS for blog + analytics; tighten site_settings public read (allowlist)
-- Safe / additive. No DROP of data. Apply in Supabase SQL Editor after review.
-- Depends on public.is_admin() (030 / 062).

-- ─── blog_categories ─────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.blog_categories') IS NULL THEN
    RAISE NOTICE '064: blog_categories missing — skip';
    RETURN;
  END IF;

  ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "blog_categories_public_select_active" ON public.blog_categories;
  CREATE POLICY "blog_categories_public_select_active"
    ON public.blog_categories
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

  DROP POLICY IF EXISTS "blog_categories_admin_all" ON public.blog_categories;
  CREATE POLICY "blog_categories_admin_all"
    ON public.blog_categories
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
END $$;

-- ─── blog_posts ──────────────────────────────────────────────────
DO $$
DECLARE
  has_deleted boolean;
BEGIN
  IF to_regclass('public.blog_posts') IS NULL THEN
    RAISE NOTICE '064: blog_posts missing — skip';
    RETURN;
  END IF;

  ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'deleted_at'
  ) INTO has_deleted;

  DROP POLICY IF EXISTS "blog_posts_public_select_published" ON public.blog_posts;
  IF has_deleted THEN
    EXECUTE $p$
      CREATE POLICY "blog_posts_public_select_published"
        ON public.blog_posts
        FOR SELECT
        TO anon, authenticated
        USING (status = 'published' AND deleted_at IS NULL)
    $p$;
  ELSE
    EXECUTE $p$
      CREATE POLICY "blog_posts_public_select_published"
        ON public.blog_posts
        FOR SELECT
        TO anon, authenticated
        USING (status = 'published')
    $p$;
  END IF;

  DROP POLICY IF EXISTS "blog_posts_admin_all" ON public.blog_posts;
  CREATE POLICY "blog_posts_admin_all"
    ON public.blog_posts
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
END $$;

-- ─── analytics_events ────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.analytics_events') IS NULL THEN
    RAISE NOTICE '064: analytics_events missing — skip';
    RETURN;
  END IF;

  ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "analytics_events_insert_public" ON public.analytics_events;
  CREATE POLICY "analytics_events_insert_public"
    ON public.analytics_events
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

  DROP POLICY IF EXISTS "analytics_events_admin_select" ON public.analytics_events;
  CREATE POLICY "analytics_events_admin_select"
    ON public.analytics_events
    FOR SELECT
    TO authenticated
    USING (public.is_admin());
END $$;

-- ─── site_settings: replace open public SELECT with allowlist ────
DO $$
BEGIN
  IF to_regclass('public.site_settings') IS NULL THEN
    RAISE NOTICE '064: site_settings missing — skip';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "settings_public_read" ON public.site_settings;
  DROP POLICY IF EXISTS "Public can read site_settings" ON public.site_settings;
  DROP POLICY IF EXISTS "public read site_settings" ON public.site_settings;
  DROP POLICY IF EXISTS "site_settings_public_select_allowlist" ON public.site_settings;

  CREATE POLICY "site_settings_public_select_allowlist"
    ON public.site_settings
    FOR SELECT
    TO anon, authenticated
    USING (
      key IN (
        'store_support_phone',
        'store_support_email',
        'free_shipping_enabled',
        'free_shipping_min_amount',
        'free_shipping_exclude_provider_codes',
        'flash_sale_ends_at',
        'store',
        'seo',
        'page_faq',
        'page_terms',
        'page_privacy',
        'page_shipping',
        'page_returns',
        'page_about',
        'page_size_guide'
      )
      OR key LIKE 'page_%'
    );
END $$;
