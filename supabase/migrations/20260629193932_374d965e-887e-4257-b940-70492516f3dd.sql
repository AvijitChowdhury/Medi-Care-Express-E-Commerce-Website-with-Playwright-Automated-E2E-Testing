
DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can read fraud checks" ON public.fraud_checks;
DROP POLICY IF EXISTS "Public read settings" ON public.site_settings;

CREATE OR REPLACE FUNCTION public.get_checkout_fraud_flags()
RETURNS TABLE(fraud_check_enabled boolean, fraud_auto_check_checkout boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(fraud_check_enabled, false), COALESCE(fraud_auto_check_checkout, false)
  FROM public.site_settings WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_checkout_fraud_flags() TO anon, authenticated;
