-- =============================================================================
-- VERIFICACION COMPLETA del patch_rls_hardening.sql
-- Ejecutar QUERY POR QUERY (una a la vez) en Supabase SQL Editor
-- =============================================================================

-- QUERY 1: Verificar que get_dashboard_metrics ya NO tiene SECURITY DEFINER
-- Debe devolver: is_security_definer = FALSE
SELECT
  proname AS funcion,
  CASE prosecdef WHEN true THEN 'SECURITY DEFINER (INSEGURO)' ELSE 'SECURITY INVOKER (OK)' END AS modo_seguridad
FROM pg_proc
WHERE proname = 'get_dashboard_metrics'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- QUERY 2: Verificar triggers creados en tablas transaccionales
-- Debe devolver una fila por cada tabla que tenga columna ong_id
SELECT
  trigger_name,
  event_object_table AS tabla,
  action_timing AS momento,
  event_manipulation AS evento
FROM information_schema.triggers
WHERE trigger_name = 'trg_set_ong_id'
  AND trigger_schema = 'public'
ORDER BY event_object_table;

-- QUERY 3: Verificar proyectos sin ong_id (debe ser 0)
SELECT COUNT(*) AS proyectos_sin_ong_id FROM public.proyectos WHERE ong_id IS NULL;

-- QUERY 4: Verificar donaciones sin ong_id (debe ser 0)
SELECT COUNT(*) AS donaciones_sin_ong_id FROM public.donaciones WHERE ong_id IS NULL;

-- QUERY 5: Ver todas las politicas RLS activas en tablas criticas
SELECT
  schemaname,
  tablename,
  policyname,
  cmd AS operacion,
  qual AS condicion_using
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('proyectos','presupuestos','donaciones','comprobantes_gasto','transacciones_bancarias','jornadas','beneficiarios','solicitudes_gasto')
ORDER BY tablename, policyname;

-- QUERY 6: Verificar que RLS esta habilitado en las tablas
SELECT
  relname AS tabla,
  relrowsecurity AS rls_habilitado,
  relforcerowsecurity AS rls_forzado
FROM pg_class
WHERE relname IN ('proyectos','presupuestos','donaciones','comprobantes_gasto','transacciones_bancarias','jornadas','beneficiarios','solicitudes_gasto')
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY relname;
