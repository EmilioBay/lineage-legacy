
-- Token wallets per user
CREATE TABLE public.user_tokens (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_tokens TO authenticated;
GRANT ALL ON public.user_tokens TO service_role;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own token balance" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Token ledger
CREATE TYPE public.token_txn_type AS ENUM ('purchase','spend','refund','bonus','adjustment');

CREATE TABLE public.token_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type public.token_txn_type NOT NULL,
  description TEXT,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.token_transactions TO authenticated;
GRANT ALL ON public.token_transactions TO service_role;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own token transactions" ON public.token_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX token_transactions_user_created_idx ON public.token_transactions(user_id, created_at DESC);

-- Extend promotions with owner + token cost
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_cost INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS promotions_owner_created_idx ON public.promotions(owner_id, created_at DESC);

-- Allow owners to read their own promotions
CREATE POLICY "Owners read own promotions" ON public.promotions
  FOR SELECT USING (auth.uid() = owner_id);

-- Server-side function: spend tokens to create a promotion atomically
CREATE OR REPLACE FUNCTION public.create_token_promotion(
  _server_id UUID,
  _type public.promotion_type,
  _days INTEGER,
  _cost INTEGER
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
  _owner UUID;
  _status server_status;
  _balance INTEGER;
  _promo_id UUID;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _days <= 0 OR _days > 90 THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  IF _cost <= 0 THEN RAISE EXCEPTION 'Invalid cost'; END IF;

  SELECT owner_id, status INTO _owner, _status FROM public.servers WHERE id = _server_id;
  IF _owner IS NULL OR _owner <> _user THEN RAISE EXCEPTION 'Not your server'; END IF;
  IF _status <> 'approved' THEN RAISE EXCEPTION 'Server not approved'; END IF;

  INSERT INTO public.user_tokens(user_id, balance) VALUES (_user, 0)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO _balance FROM public.user_tokens WHERE user_id = _user FOR UPDATE;
  IF _balance < _cost THEN RAISE EXCEPTION 'Insufficient tokens'; END IF;

  UPDATE public.user_tokens SET balance = balance - _cost WHERE user_id = _user;

  INSERT INTO public.promotions(server_id, type, start_date, end_date, payment_status, owner_id, token_cost)
  VALUES (_server_id, _type, now(), now() + (_days || ' days')::interval, 'paid', _user, _cost)
  RETURNING id INTO _promo_id;

  INSERT INTO public.token_transactions(user_id, amount, type, description, promotion_id)
  VALUES (_user, -_cost, 'spend', 'Promotion: ' || _type::text || ' for ' || _days || ' days', _promo_id);

  RETURN _promo_id;
END;
$$;
