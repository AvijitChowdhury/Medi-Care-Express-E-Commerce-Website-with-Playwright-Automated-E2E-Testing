CREATE OR REPLACE FUNCTION public.can_insert_order_item(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND (
        (auth.uid() IS NULL AND o.user_id IS NULL)
        OR (auth.uid() IS NOT NULL AND (o.user_id IS NULL OR o.user_id = auth.uid()))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_insert_order_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_order_item(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Insert items for own order" ON public.order_items;
CREATE POLICY "Insert items for own order"
  ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.can_insert_order_item(order_id));