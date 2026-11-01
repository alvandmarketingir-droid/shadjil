-- 061: هزینه ارسال روی سفارش + رزرو موجودی مهمان (session)
-- استاندارد: سرور مبلغ ارسال را دوباره محاسبه می‌کند؛ مهمان هم مثل لاگین رزرو ۱۵ دقیقه‌ای دارد.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12,0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_method_id UUID,
  ADD COLUMN IF NOT EXISTS shipping_method_title TEXT;

COMMENT ON COLUMN public.orders.shipping_fee IS 'هزینه ارسال به تومان در لحظه ثبت سفارش';
COMMENT ON COLUMN public.orders.shipping_method_id IS 'شناسه روش ارسال انتخاب‌شده';
COMMENT ON COLUMN public.orders.shipping_method_title IS 'عنوان روش ارسال در لحظه ثبت';

-- رزرو مهمان: session_id
ALTER TABLE public.stock_reservations
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.stock_reservations
  ADD COLUMN IF NOT EXISTS session_id TEXT;

ALTER TABLE public.stock_reservations
  DROP CONSTRAINT IF EXISTS stock_reservations_owner_chk;

ALTER TABLE public.stock_reservations
  ADD CONSTRAINT stock_reservations_owner_chk
  CHECK (user_id IS NOT NULL OR (session_id IS NOT NULL AND length(trim(session_id)) > 0));

CREATE INDEX IF NOT EXISTS idx_stock_res_session_active
  ON public.stock_reservations (session_id)
  WHERE status = 'active' AND session_id IS NOT NULL;

-- رزرو برای session (مهمان)
CREATE OR REPLACE FUNCTION public.reserve_variant_stock_session(
  p_session_id text,
  p_variant_id uuid,
  p_qty int,
  p_minutes int DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
  ttl int;
  sid text;
BEGIN
  sid := nullif(trim(p_session_id), '');
  IF sid IS NULL OR p_variant_id IS NULL OR p_qty IS NULL OR p_qty < 1 THEN
    RETURN false;
  END IF;
  ttl := GREATEST(1, LEAST(COALESCE(p_minutes, 15), 60));
  PERFORM release_expired_stock_reservations();
  PERFORM release_session_variant_reservation(sid, p_variant_id);

  ok := decrement_variant_stock(p_variant_id, p_qty);
  IF NOT ok THEN
    RETURN false;
  END IF;

  INSERT INTO stock_reservations (user_id, session_id, variant_id, quantity, status, expires_at)
  VALUES (NULL, sid, p_variant_id, p_qty, 'active', now() + make_interval(mins => ttl));

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_session_variant_reservation(
  p_session_id text,
  p_variant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id, quantity
    FROM stock_reservations
    WHERE session_id = p_session_id
      AND variant_id = p_variant_id
      AND status = 'active'
    FOR UPDATE
  LOOP
    UPDATE stock_reservations
    SET status = 'released', updated_at = now()
    WHERE id = r.id AND status = 'active';
    IF FOUND THEN
      PERFORM increment_variant_stock(p_variant_id, r.quantity);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_all_session_reservations(p_session_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD; n int := 0;
BEGIN
  FOR r IN
    SELECT id, variant_id, quantity
    FROM stock_reservations
    WHERE session_id = p_session_id AND status = 'active'
    FOR UPDATE
  LOOP
    UPDATE stock_reservations
    SET status = 'released', updated_at = now()
    WHERE id = r.id AND status = 'active';
    IF FOUND THEN
      PERFORM increment_variant_stock(r.variant_id, r.quantity);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_session_reservations(p_session_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  UPDATE stock_reservations
  SET status = 'consumed', updated_at = now()
  WHERE session_id = p_session_id AND status = 'active';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_session_reservations(
  p_session_id text,
  p_minutes int DEFAULT 15
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ttl int; n int;
BEGIN
  ttl := GREATEST(1, LEAST(COALESCE(p_minutes, 15), 60));
  UPDATE stock_reservations
  SET expires_at = now() + make_interval(mins => ttl), updated_at = now()
  WHERE session_id = p_session_id AND status = 'active' AND expires_at > now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_variant_stock_session(text, uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_session_variant_reservation(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_all_session_reservations(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_session_reservations(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_session_reservations(text, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reserve_variant_stock_session(text, uuid, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_session_variant_reservation(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_all_session_reservations(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_session_reservations(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.extend_session_reservations(text, int) TO service_role;
