-- 062: align is_admin() + document role constraint
-- profiles.role CHECK is ('customer','admin','staff') — there is no 'superadmin' in DB.
-- Code that referenced superadmin should treat only 'admin' as panel admin.
-- staff remains non-admin for RLS (can be extended later with is_staff()).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(p.role) = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'True when auth.uid() has profiles.role = admin. staff is not admin.';
