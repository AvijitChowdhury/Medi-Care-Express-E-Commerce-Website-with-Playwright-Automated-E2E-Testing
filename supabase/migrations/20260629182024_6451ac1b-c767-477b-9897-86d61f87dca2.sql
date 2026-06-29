
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS steadfast_consignment_id BIGINT,
  ADD COLUMN IF NOT EXISTS steadfast_tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS steadfast_status TEXT,
  ADD COLUMN IF NOT EXISTS steadfast_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS steadfast_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_steadfast_consignment_idx ON public.orders(steadfast_consignment_id) WHERE steadfast_consignment_id IS NOT NULL;
