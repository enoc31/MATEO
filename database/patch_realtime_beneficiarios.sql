-- =========================================================================
-- PATCH: patch_realtime_beneficiarios.sql
-- Objetivo: Configurar soporte para registro público (anónimo) de beneficiarios,
--           habilitar RLS y replicación en tiempo real (Supabase Realtime).
-- Ejecutar en: Supabase SQL Editor
-- =========================================================================

-- 0. Habilitar y forzar Row Level Security (RLS)
-- Esto garantiza que las políticas de aislamiento de tenant sean aplicadas por Postgres
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarios FORCE ROW LEVEL SECURITY;

-- 1. Habilitar la Replicación en Tiempo Real para la tabla beneficiarios
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication 
        WHERE pubname = 'supabase_realtime'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'beneficiarios'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiarios;
        END IF;
    END IF;
END $$;

-- 2. Eliminar políticas previas conflictivas si existen
DROP POLICY IF EXISTS "jornadas_public_read_active" ON public.jornadas;
DROP POLICY IF EXISTS "beneficiarios_public_insert" ON public.beneficiarios;

-- 3. Crear política para permitir la lectura pública de jornadas activas
-- Esto permite a los colaboradores no logueados cargar los detalles de la jornada actual
CREATE POLICY "jornadas_public_read_active" ON public.jornadas
  FOR SELECT
  TO anon
  USING (activa = true);

-- 4. Crear política para permitir la inserción pública de beneficiarios
-- Esto permite registrar beneficiarios desde el formulario público de campo sin requerir sesión
CREATE POLICY "beneficiarios_public_insert" ON public.beneficiarios
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Nota: Las consultas de lectura (SELECT) o modificación (UPDATE, DELETE) de beneficiarios
-- siguen estrictamente protegidas bajo la política "aislamiento_ong_beneficiarios"
-- requiriendo autenticación y limitándose únicamente a los datos del tenant (ONG) del usuario.
