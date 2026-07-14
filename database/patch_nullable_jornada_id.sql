-- =========================================================================
-- PATCH: patch_nullable_jornada_id.sql
-- Objetivo: Asegurar que el campo jornada_id en la tabla beneficiarios
--           sea opcional (nullable), permitiendo desvincular beneficiarios
--           cuando se elimina una jornada sin borrar sus registros asociados.
-- Ejecutar en: Supabase SQL Editor
-- =========================================================================

ALTER TABLE public.beneficiarios ALTER COLUMN jornada_id DROP NOT NULL;
