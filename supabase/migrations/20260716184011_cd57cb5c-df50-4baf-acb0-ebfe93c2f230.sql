
-- Spotlight positional pricing (10 slots; 1-3 premium, 4-10 standard/FIFO)
CREATE TABLE IF NOT EXISTS public.spotlight_pricing (
  position smallint PRIMARY KEY CHECK (position BETWEEN 1 AND 10),
  cost_per_day integer NOT NULL CHECK (cost_per_day > 0),
  tier text NOT NULL CHECK (tier IN ('premium','standard')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spotlight_pricing TO anon, authenticated;
GRANT ALL ON public.spotlight_pricing TO service_role;
ALTER TABLE public.spotlight_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read spotlight pricing" ON public.spotlight_pricing;
CREATE POLICY "Anyone can read spotlight pricing" ON public.spotlight_pricing FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage spotlight pricing" ON public.spotlight_pricing;
CREATE POLICY "Admins manage spotlight pricing" ON public.spotlight_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.spotlight_pricing(position, cost_per_day, tier) VALUES
  (1, 40, 'premium'), (2, 30, 'premium'), (3, 25, 'premium'),
  (4, 12, 'standard'),(5, 12, 'standard'),(6, 12, 'standard'),(7, 12, 'standard'),
  (8, 12, 'standard'),(9, 12, 'standard'),(10, 12, 'standard')
ON CONFLICT (position) DO NOTHING;

-- Position on promotions (only used when type='spotlight')
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS spotlight_position smallint
  CHECK (spotlight_position IS NULL OR (spotlight_position BETWEEN 1 AND 10));

CREATE INDEX IF NOT EXISTS promotions_spotlight_active_idx
  ON public.promotions(spotlight_position, end_date)
  WHERE type='spotlight' AND payment_status='paid';

-- RPC: create positional spotlight promotion
CREATE OR REPLACE FUNCTION public.create_spotlight_promotion(
  _server_id uuid, _position smallint, _days integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _owner uuid; _status server_status;
  _cost_per_day int; _cost int;
  _balance int; _promo_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _days <= 0 OR _days > 90 THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  IF _position < 1 OR _position > 10 THEN RAISE EXCEPTION 'Invalid position'; END IF;

  SELECT owner_id, status INTO _owner, _status FROM public.servers WHERE id = _server_id;
  IF _owner IS NULL OR _owner <> _user THEN RAISE EXCEPTION 'Not your server'; END IF;
  IF _status <> 'approved' THEN RAISE EXCEPTION 'Server not approved'; END IF;

  SELECT cost_per_day INTO _cost_per_day FROM public.spotlight_pricing WHERE position = _position;
  IF _cost_per_day IS NULL THEN RAISE EXCEPTION 'Position pricing missing'; END IF;
  _cost := _cost_per_day * _days;

  -- Availability: no active paid promotion in this position
  IF EXISTS (
    SELECT 1 FROM public.promotions
    WHERE type='spotlight' AND spotlight_position=_position
      AND payment_status='paid' AND end_date > now()
  ) THEN RAISE EXCEPTION 'Spotlight position % is occupied', _position;
  END IF;

  INSERT INTO public.user_tokens(user_id, balance) VALUES (_user, 0)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO _balance FROM public.user_tokens WHERE user_id = _user FOR UPDATE;
  IF _balance < _cost THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  UPDATE public.user_tokens SET balance = balance - _cost WHERE user_id = _user;

  INSERT INTO public.promotions(server_id, type, spotlight_position, start_date, end_date, payment_status, owner_id, token_cost)
  VALUES (_server_id, 'spotlight', _position, now(), now() + (_days || ' days')::interval, 'paid', _user, _cost)
  RETURNING id INTO _promo_id;

  INSERT INTO public.token_transactions(user_id, amount, type, description, promotion_id)
  VALUES (_user, -_cost, 'spend', 'Spotlight position ' || _position || ' for ' || _days || ' days', _promo_id);

  RETURN _promo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_spotlight_promotion(uuid, smallint, integer) TO authenticated;
