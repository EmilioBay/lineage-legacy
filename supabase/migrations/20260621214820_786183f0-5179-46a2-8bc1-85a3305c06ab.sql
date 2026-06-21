
CREATE OR REPLACE FUNCTION public.is_identifier_taken(_identifier text, _exclude_server uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
