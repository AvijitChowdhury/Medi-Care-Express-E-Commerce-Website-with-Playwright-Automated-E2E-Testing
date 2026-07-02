GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;