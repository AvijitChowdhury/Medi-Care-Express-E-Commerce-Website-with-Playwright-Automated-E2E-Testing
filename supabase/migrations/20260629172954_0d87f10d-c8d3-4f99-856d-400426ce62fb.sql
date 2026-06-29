
-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_subtotal numeric(10,2) NOT NULL DEFAULT 0,
  max_discount numeric(10,2),
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT
  TO anon, authenticated USING (active = true OR has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL
  TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER coupons_touch BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Orders: store applied coupon
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;

-- Reviews: link to user + order, allow customer submissions
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_product_unique
  ON public.reviews(user_id, product_id) WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Users insert review for purchased product" ON public.reviews;
CREATE POLICY "Users insert review for purchased product" ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = auth.uid()
        AND oi.product_id = reviews.product_id
        AND o.status IN ('confirmed','processing','shipped','delivered')
    )
  );

DROP POLICY IF EXISTS "Users manage own reviews" ON public.reviews;
CREATE POLICY "Users manage own reviews" ON public.reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own reviews" ON public.reviews;
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

-- Coupon validation
CREATE OR REPLACE FUNCTION public.apply_coupon(p_code text, p_subtotal numeric)
RETURNS TABLE(discount numeric, code text, discount_type text, discount_value numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.coupons;
  v_disc numeric := 0;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE lower(coupons.code) = lower(trim(p_code)) AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'কুপন কোডটি অবৈধ'; END IF;
  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN RAISE EXCEPTION 'কুপন এখনো সক্রিয় হয়নি'; END IF;
  IF c.expires_at IS NOT NULL AND now() > c.expires_at THEN RAISE EXCEPTION 'কুপনের মেয়াদ শেষ'; END IF;
  IF c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit THEN RAISE EXCEPTION 'কুপনের ব্যবহার সীমা শেষ'; END IF;
  IF p_subtotal < c.min_subtotal THEN RAISE EXCEPTION 'ন্যূনতম সাবটোটাল প্রয়োজন: %', c.min_subtotal; END IF;

  IF c.discount_type = 'percent' THEN
    v_disc := round(p_subtotal * c.discount_value / 100, 2);
  ELSE
    v_disc := c.discount_value;
  END IF;
  IF c.max_discount IS NOT NULL AND v_disc > c.max_discount THEN v_disc := c.max_discount; END IF;
  IF v_disc > p_subtotal THEN v_disc := p_subtotal; END IF;

  RETURN QUERY SELECT v_disc, c.code, c.discount_type, c.discount_value;
END $$;

GRANT EXECUTE ON FUNCTION public.apply_coupon(text, numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.coupons SET usage_count = usage_count + 1 WHERE lower(code) = lower(trim(p_code));
$$;

GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO anon, authenticated;
