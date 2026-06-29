
-- =========================
-- 1. CHAT SESSIONS hardening
-- =========================
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS access_token uuid;

-- Backfill so existing rows still work for admins (no anon access anyway)
UPDATE public.chat_sessions SET access_token = gen_random_uuid() WHERE access_token IS NULL;
ALTER TABLE public.chat_sessions ALTER COLUMN access_token SET NOT NULL;
ALTER TABLE public.chat_sessions ALTER COLUMN access_token SET DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Anyone read chat session" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone update chat session" ON public.chat_sessions;
DROP POLICY IF EXISTS "Anyone insert chat session" ON public.chat_sessions;

CREATE POLICY "Admins read chat sessions" ON public.chat_sessions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update chat sessions" ON public.chat_sessions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Block direct anon inserts; use RPC instead.
-- (no INSERT policy = no INSERT for non-admins; admin already covered by FOR ALL via has_role? No, only DELETE/SELECT/UPDATE listed. Service role bypasses RLS.)

-- =========================
-- 2. CHAT MESSAGES hardening
-- =========================
DROP POLICY IF EXISTS "Anyone read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone insert chat message" ON public.chat_messages;

CREATE POLICY "Admins read chat messages" ON public.chat_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- 3. INCOMPLETE ORDERS hardening
-- =========================
ALTER TABLE public.incomplete_orders
  ADD COLUMN IF NOT EXISTS access_token uuid;
UPDATE public.incomplete_orders SET access_token = gen_random_uuid() WHERE access_token IS NULL;
ALTER TABLE public.incomplete_orders ALTER COLUMN access_token SET NOT NULL;
ALTER TABLE public.incomplete_orders ALTER COLUMN access_token SET DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Anyone update incomplete order" ON public.incomplete_orders;
DROP POLICY IF EXISTS "Anyone insert incomplete order" ON public.incomplete_orders;

CREATE POLICY "Admins update incomplete orders" ON public.incomplete_orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- 4. USER ROLES — explicit deny for non-admin writes
-- =========================
-- Existing: "Admins manage roles" (ALL, admin) and "Users view own roles" (SELECT).
-- No INSERT/UPDATE/DELETE policy for non-admins means RLS denies, which is correct.
-- Add a restrictive policy as defense in depth so no future permissive policy can grant writes.
DROP POLICY IF EXISTS "Only admins can write roles" ON public.user_roles;
CREATE POLICY "Only admins can write roles" ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (current_setting('request.jwt.claims', true) IS NULL) -- allow trigger context
    OR (auth.uid() IS NULL AND (SELECT current_user) IN ('postgres','supabase_admin','service_role'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (current_setting('request.jwt.claims', true) IS NULL)
    OR (auth.uid() IS NULL AND (SELECT current_user) IN ('postgres','supabase_admin','service_role'))
  );

-- Allow SELECT for the user themselves (existing policy remains).
-- Permissive admin policy remains.

-- =========================
-- 5. RPC FUNCTIONS for anonymous guest chat / incomplete order
-- =========================

-- Chat: start session (creates row, returns id + token, posts welcome message)
CREATE OR REPLACE FUNCTION public.start_chat_session(
  p_name text,
  p_username text,
  p_welcome text DEFAULT NULL
)
RETURNS TABLE (session_id uuid, access_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_token uuid := gen_random_uuid();
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name required';
  END IF;
  IF p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RAISE EXCEPTION 'username required';
  END IF;

  INSERT INTO public.chat_sessions (user_name, username, unread_admin, access_token, last_message_at)
  VALUES (trim(p_name), trim(p_username), 1, v_token, now())
  RETURNING id INTO v_id;

  IF p_welcome IS NOT NULL AND length(p_welcome) > 0 THEN
    INSERT INTO public.chat_messages (session_id, sender, body)
    VALUES (v_id, 'system', p_welcome);
  END IF;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

-- Chat: post a user message (verifies token, bumps unread)
CREATE OR REPLACE FUNCTION public.post_chat_message(
  p_session_id uuid,
  p_access_token uuid,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id uuid;
BEGIN
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'empty message';
  END IF;
  IF length(p_body) > 4000 THEN
    RAISE EXCEPTION 'message too long';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = p_session_id AND access_token = p_access_token
  ) THEN
    RAISE EXCEPTION 'invalid session token';
  END IF;

  INSERT INTO public.chat_messages (session_id, sender, body)
  VALUES (p_session_id, 'user', trim(p_body))
  RETURNING id INTO v_msg_id;

  UPDATE public.chat_sessions
  SET last_message_at = now(),
      unread_admin = COALESCE(unread_admin, 0) + 1
  WHERE id = p_session_id;

  RETURN v_msg_id;
END;
$$;

-- Chat: fetch own messages
CREATE OR REPLACE FUNCTION public.get_chat_messages(
  p_session_id uuid,
  p_access_token uuid
)
RETURNS TABLE (id uuid, sender text, body text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_sessions
    WHERE id = p_session_id AND access_token = p_access_token
  ) THEN
    RAISE EXCEPTION 'invalid session token';
  END IF;
  RETURN QUERY
    SELECT m.id, m.sender::text, m.body, m.created_at
    FROM public.chat_messages m
    WHERE m.session_id = p_session_id
    ORDER BY m.created_at ASC;
END;
$$;

-- Incomplete orders: upsert with token verification
CREATE OR REPLACE FUNCTION public.upsert_incomplete_order(
  p_session_id text,
  p_access_token uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_area text,
  p_payment_method text,
  p_notes text,
  p_cart jsonb,
  p_subtotal numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_existing_token uuid;
BEGIN
  SELECT id, access_token INTO v_id, v_existing_token
  FROM public.incomplete_orders
  WHERE session_id = p_session_id;

  IF v_id IS NULL THEN
    INSERT INTO public.incomplete_orders (
      session_id, access_token,
      customer_name, customer_phone, customer_email,
      shipping_address, shipping_city, shipping_area,
      payment_method, notes, cart, subtotal, recovered
    ) VALUES (
      p_session_id, p_access_token,
      p_customer_name, p_customer_phone, p_customer_email,
      p_shipping_address, p_shipping_city, p_shipping_area,
      p_payment_method, p_notes, p_cart, p_subtotal, false
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  IF v_existing_token <> p_access_token THEN
    RAISE EXCEPTION 'invalid session token';
  END IF;

  UPDATE public.incomplete_orders SET
    customer_name = p_customer_name,
    customer_phone = p_customer_phone,
    customer_email = p_customer_email,
    shipping_address = p_shipping_address,
    shipping_city = p_shipping_city,
    shipping_area = p_shipping_area,
    payment_method = p_payment_method,
    notes = p_notes,
    cart = p_cart,
    subtotal = p_subtotal,
    updated_at = now()
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

-- Mark recovered (called when order completes). Requires session+token.
CREATE OR REPLACE FUNCTION public.mark_incomplete_order_recovered(
  p_session_id text,
  p_access_token uuid,
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.incomplete_orders
  SET recovered = true,
      recovered_order_id = p_order_id,
      recovered_at = now()
  WHERE session_id = p_session_id AND access_token = p_access_token;
END;
$$;

-- =========================
-- 6. EXECUTE permissions
-- =========================

-- Revoke direct execute on has_role from anon/authenticated.
-- RLS policies that reference has_role run as the table owner, so policies still work.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- Grant execute on new RPCs to anon + authenticated (guest chat / checkout).
REVOKE ALL ON FUNCTION public.start_chat_session(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_chat_session(text, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.post_chat_message(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_chat_message(uuid, uuid, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_chat_messages(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_messages(uuid, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.upsert_incomplete_order(text, uuid, text, text, text, text, text, text, text, text, jsonb, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_incomplete_order(text, uuid, text, text, text, text, text, text, text, text, jsonb, numeric) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.mark_incomplete_order_recovered(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_incomplete_order_recovered(text, uuid, uuid) TO anon, authenticated;

-- Revoke direct table privileges from anon for the locked tables
REVOKE INSERT, UPDATE, SELECT, DELETE ON public.chat_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, SELECT, DELETE ON public.chat_messages FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.incomplete_orders FROM anon, authenticated;

-- Admins (authenticated role) still need SELECT/UPDATE/DELETE on these via RLS policies
GRANT SELECT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.incomplete_orders TO authenticated;

GRANT ALL ON public.chat_sessions TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.incomplete_orders TO service_role;
