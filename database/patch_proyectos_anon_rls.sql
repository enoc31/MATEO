-- =========================================================================
-- PATCH: patch_proyectos_anon_rls.sql
-- Objetivo: Permitir la lectura pública de proyectos activos para el rol 'anon'
--           con la finalidad de cargar el nombre del proyecto en la previsualización
--           de enlaces públicos (como WhatsApp) de registro de beneficiarios.
-- Ejecutar en: Supabase SQL Editor
-- =========================================================================

-- 1. Eliminar política previa si existe
DROP POLICY IF EXISTS "proyectos_anon_read_active" ON public.proyectos;

-- 2. Crear política para permitir lectura pública de proyectos activos a usuarios anónimos
CREATE POLICY "proyectos_anon_read_active" ON public.proyectos
  FOR SELECT
  TO anon
  USING (activo = true);

-- Nota: Esta política es puramente de lectura (SELECT) y solo expone proyectos
-- marcados como activos. La creación y edición siguen restringidas a administradores
-- y directores autenticados bajo la política "aislamiento_ong_proyectos".
