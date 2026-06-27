ALTER TYPE public.server_status ADD VALUE IF NOT EXISTS 'changes_requested';
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS moderator_note text;