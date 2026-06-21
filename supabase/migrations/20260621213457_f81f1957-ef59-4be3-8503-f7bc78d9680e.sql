
-- Roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Chronicle enum (common L2 versions)
CREATE TYPE public.server_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Servers table
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  discord_url TEXT,
  chronicle TEXT NOT NULL,
  rates TEXT NOT NULL,
  country TEXT,
  description TEXT NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  status server_status NOT NULL DEFAULT 'pending',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT SELECT ON public.servers TO anon;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved servers" ON public.servers FOR SELECT USING (status = 'approved' OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create servers" ON public.servers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their server" ON public.servers FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete servers" ON public.servers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_servers_status ON public.servers(status);
CREATE INDEX idx_servers_first_seen ON public.servers(first_seen_at DESC);

-- Name history
CREATE TABLE public.server_name_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  old_name TEXT NOT NULL,
  new_name TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.server_name_history TO authenticated;
GRANT SELECT ON public.server_name_history TO anon;
GRANT ALL ON public.server_name_history TO service_role;
ALTER TABLE public.server_name_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view name history" ON public.server_name_history FOR SELECT USING (true);
CREATE POLICY "Owners and admins can insert name history" ON public.server_name_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Domain history
CREATE TABLE public.server_domain_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  old_domain TEXT NOT NULL,
  new_domain TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.server_domain_history TO authenticated;
GRANT SELECT ON public.server_domain_history TO anon;
GRANT ALL ON public.server_domain_history TO service_role;
ALTER TABLE public.server_domain_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view domain history" ON public.server_domain_history FOR SELECT USING (true);
CREATE POLICY "Owners and admins can insert domain history" ON public.server_domain_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.servers s WHERE s.id = server_id AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Votes
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT NOT NULL,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  vote_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT
);
GRANT SELECT ON public.votes TO anon, authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read votes" ON public.votes FOR SELECT USING (true);
-- Inserts only via server function (service role)

CREATE INDEX idx_votes_server_year ON public.votes(server_id, vote_year);
CREATE INDEX idx_votes_ip_server_created ON public.votes(ip_address, server_id, created_at DESC);

-- Yearly rankings (snapshot)
CREATE TABLE public.yearly_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  year INT NOT NULL,
  rank INT NOT NULL,
  total_votes INT NOT NULL DEFAULT 0,
  UNIQUE (server_id, year)
);
GRANT SELECT ON public.yearly_rankings TO anon, authenticated;
GRANT ALL ON public.yearly_rankings TO service_role;
ALTER TABLE public.yearly_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view yearly rankings" ON public.yearly_rankings FOR SELECT USING (true);

-- Daily server stats for the graph
CREATE TABLE public.server_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  rank INT,
  votes INT NOT NULL DEFAULT 0,
  UNIQUE (server_id, date)
);
GRANT SELECT ON public.server_stats TO anon, authenticated;
GRANT ALL ON public.server_stats TO service_role;
ALTER TABLE public.server_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view server stats" ON public.server_stats FOR SELECT USING (true);

-- Promotions
CREATE TYPE public.promotion_type AS ENUM ('banner', 'sponsored_new', 'spotlight');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'cancelled');

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  type promotion_type NOT NULL,
  position INT NOT NULL DEFAULT 1,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_promotions_active ON public.promotions(type, payment_status, end_date);

-- Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON public.servers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
