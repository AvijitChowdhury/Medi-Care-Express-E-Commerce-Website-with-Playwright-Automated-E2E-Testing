ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS uddoktapay_transaction_id text,
  ADD COLUMN IF NOT EXISTS uddoktapay_sender_number text,
  ADD COLUMN IF NOT EXISTS uddoktapay_payment_method text,
  ADD COLUMN IF NOT EXISTS uddoktapay_raw jsonb;