-- 063: Harden profiles UPDATE (block role escalation) + RLS on shipping_methods
-- Safe / additive. Apply in Supabase SQL Editor after review. Does not DROP data.

-- 1) profiles: own UPDATE must not change role (or other privileged cols via USING/WITH CHECK)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2) shipping_methods: enable RLS; public can read active rows WITHOUT api_config
--    (PostgREST still returns selected columns — app should not select api_config for anon.
--     Restrict column grants so anon/authenticated cannot SELECT api_config.)
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_methods_public_select_active" ON public.shipping_methods;
CREATE POLICY "shipping_methods_public_select_active"
  ON public.shipping_methods
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "shipping_methods_admin_all" ON public.shipping_methods;
CREATE POLICY "shipping_methods_admin_all"
  ON public.shipping_methods
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoke api_config from client roles (service_role bypasses RLS+grants as usual)
REVOKE ALL ON public.shipping_methods FROM anon, authenticated;
GRANT SELECT (
  id, title, description, fee, is_active, sort_order, provider_code, pricing_type, created_at, updated_at
) ON public.shipping_methods TO anon, authenticated;
-- Admin UI uses service role via server actions; if JWT admin ever selects api_config, grant via service only.
