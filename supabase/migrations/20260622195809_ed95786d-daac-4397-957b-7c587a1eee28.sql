
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS launch_date date,
  ADD COLUMN IF NOT EXISTS server_type text;
