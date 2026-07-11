
CREATE TABLE IF NOT EXISTS public.promotion_pricing (
  type promotion_type PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  cost_per_day integer NOT NULL CHECK (cost_per_day > 0),
  exclusive boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotion_pricing TO anon, authenticated;
GRANT ALL ON public.promotion_pricing TO service_role;
ALTER TABLE public.promotion_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing" ON public.promotion_pricing FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing" ON public.promotion_pricing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.promotion_pricing (type, name, description, cost_per_day, exclusive) VALUES
  ('banner',       'Homepage Top Banner',   'Prime banner in the top strip of the homepage.', 50, true),
  ('banner_left',  'Left Premium Banner',   'Large vertical banner on the left side rail.',   40, true),
  ('banner_right', 'Right Premium Banner',  'Large vertical banner on the right side rail.',  40, true),
  ('spotlight',    'Spotlight Row',         'Highlighted row inside ranking tables.',         20, false),
  ('sponsored',    'Sponsored Servers',     'Featured card in the Sponsored column.',         30, false)
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ownership_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS ownership_claims_server_idx ON public.ownership_claims (server_id, status);
CREATE INDEX IF NOT EXISTS ownership_claims_user_idx ON public.ownership_claims (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.ownership_claims TO authenticated;
GRANT ALL ON public.ownership_claims TO service_role;
ALTER TABLE public.ownership_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own claims" ON public.ownership_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own claims" ON public.ownership_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage claims" ON public.ownership_claims FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
