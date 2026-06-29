
-- Fraud check cache
CREATE TABLE IF NOT EXISTS public.fraud_checks (
  phone text PRIMARY KEY,
  total_orders int NOT NULL DEFAULT 0,
  total_delivered int NOT NULL DEFAULT 0,
  total_cancelled int NOT NULL DEFAULT 0,
  success_ratio numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'unknown',
  raw jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fraud_checks TO anon, authenticated;
GRANT ALL ON public.fraud_checks TO service_role;
ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read fraud checks" ON public.fraud_checks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manages fraud checks" ON public.fraud_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders: add fraud columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fraud_risk_level text,
  ADD COLUMN IF NOT EXISTS fraud_total_orders int,
  ADD COLUMN IF NOT EXISTS fraud_total_cancelled int,
  ADD COLUMN IF NOT EXISTS fraud_success_ratio numeric,
  ADD COLUMN IF NOT EXISTS fraud_checked_at timestamptz;

-- Site settings: fraud config
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS fraud_check_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS fraud_auto_check_checkout boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_auto_check_admin_create boolean DEFAULT true;
