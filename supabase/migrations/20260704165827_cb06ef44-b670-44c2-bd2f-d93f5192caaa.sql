
-- Permanent server ID (never changes even if name/domain change)
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS serial_id BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS servers_serial_id_uniq ON public.servers (serial_id);

-- Private admin notes (never shown to owners)
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Structured reject reason category
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS reject_reason TEXT;
