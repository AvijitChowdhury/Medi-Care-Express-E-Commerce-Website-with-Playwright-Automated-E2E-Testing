
-- 1) Fix privilege escalation: replace flawed restrictive policy on user_roles
DROP POLICY IF EXISTS "Only admins can write roles" ON public.user_roles;
CREATE POLICY "Only admins can write roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Allow guests to read their own order via secret access_token
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS access_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS orders_access_token_idx ON public.orders(access_token);

DROP POLICY IF EXISTS "Guests view own order by token" ON public.orders;
CREATE POLICY "Guests view own order by token"
  ON public.orders
  FOR SELECT
  TO anon
  USING (
    user_id IS NULL
    AND access_token::text = current_setting('request.headers', true)::json->>'x-order-token'
  );

-- Also allow order_items read for the same guest via parent order token
DROP POLICY IF EXISTS "Guests view items for own order by token" ON public.order_items;
CREATE POLICY "Guests view items for own order by token"
  ON public.order_items
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id IS NULL
        AND o.access_token::text = current_setting('request.headers', true)::json->>'x-order-token'
    )
  );
