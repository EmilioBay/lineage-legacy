
ALTER TABLE public.server_name_history
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_identifier_taken(_identifier text, _exclude_server uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servers
    WHERE status IN ('approved','pending')
      AND (id <> COALESCE(_exclude_server, '00000000-0000-0000-0000-000000000000'::uuid))
      AND (
        lower(current_name) = lower(_identifier)
        OR lower(domain) = lower(_identifier)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_identifier_taken(text, uuid) TO anon, authenticated, service_role;
