-- Speed up ChurchMembersManager / getBeneficiaries directory query by (ong_id, created_at DESC)
SET lock_timeout = '1s';
SET statement_timeout = '5s';

-- squawk-ignore require-concurrent-index-creation
CREATE INDEX IF NOT EXISTS idx_beneficiarios_ong_created_at
  ON public.beneficiarios (ong_id, created_at DESC);
