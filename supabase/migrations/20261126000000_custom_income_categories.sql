-- =============================================================================
-- MATEO Ekklesia — Categorías Personalizadas de Ingresos por Organización
-- Safe & Idempotent migration compatible with Postgres 17 & Squawk
-- =============================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- -----------------------------------------------------------------------------
-- 1. NEW TABLE: public.categorias_ingreso
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias_ingreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT categorias_ingreso_ong_slug_key UNIQUE (ong_id, slug),
  CONSTRAINT categorias_ingreso_nombre_len CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  CONSTRAINT categorias_ingreso_slug_len CHECK (char_length(btrim(slug)) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_categorias_ingreso_ong_activa
  ON public.categorias_ingreso (ong_id, activa, orden);

-- -----------------------------------------------------------------------------
-- 2. TRIGGER FOR AUTOMATIC ong_id ASSIGNMENT
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_set_ong_id ON public.categorias_ingreso;
CREATE TRIGGER trg_set_ong_id
  BEFORE INSERT ON public.categorias_ingreso
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ong_id_from_user();

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY FOR public.categorias_ingreso
-- -----------------------------------------------------------------------------
ALTER TABLE public.categorias_ingreso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias_ingreso_public_read" ON public.categorias_ingreso;
CREATE POLICY "categorias_ingreso_public_read"
  ON public.categorias_ingreso
  FOR SELECT
  TO anon, authenticated
  USING (
    activa = TRUE
    OR public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN (
        'administrador',
        'admin_iglesia',
        'tesorero',
        'pastor',
        'auditor_iglesia',
        'director',
        'auditor'
      )
    )
  );

DROP POLICY IF EXISTS "categorias_ingreso_manage_insert" ON public.categorias_ingreso;
CREATE POLICY "categorias_ingreso_manage_insert"
  ON public.categorias_ingreso
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'director')
    )
  );

DROP POLICY IF EXISTS "categorias_ingreso_manage_update" ON public.categorias_ingreso;
CREATE POLICY "categorias_ingreso_manage_update"
  ON public.categorias_ingreso
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'director')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'director')
    )
  );

DROP POLICY IF EXISTS "categorias_ingreso_manage_delete" ON public.categorias_ingreso;
CREATE POLICY "categorias_ingreso_manage_delete"
  ON public.categorias_ingreso
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'director')
    )
  );

-- -----------------------------------------------------------------------------
-- 4. RELAX reportes_aportes.categoria_aporte CHECK TO ALLOW CUSTOM CATEGORIES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  FOR v_constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'reportes_aportes'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%categoria_aporte%diezmo%'
  LOOP
    EXECUTE format('ALTER TABLE public.reportes_aportes DROP CONSTRAINT %I', v_constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reportes_aportes_categoria_aporte_len'
  ) THEN
    ALTER TABLE public.reportes_aportes
      ADD CONSTRAINT reportes_aportes_categoria_aporte_len
      CHECK (char_length(btrim(categoria_aporte)) BETWEEN 1 AND 80) NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.reportes_aportes VALIDATE CONSTRAINT reportes_aportes_categoria_aporte_len;
