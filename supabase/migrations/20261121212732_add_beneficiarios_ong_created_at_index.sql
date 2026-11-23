-- Recovered from the production migration history.
SET lock_timeout = '1s';
SET statement_timeout = '5s';

CREATE INDEX IF NOT EXISTS idx_beneficiarios_ong_created_at ON public.beneficiarios (ong_id, created_at DESC);
