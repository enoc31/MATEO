-- =============================================================================
-- pgTAP assertions validating core multi-tenant tables, RLS, and RPC security.
-- Executed by `supabase test db --local` in CI.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;

SELECT plan(6);

SELECT has_table('public', 'ongs', 'Table public.ongs exists');
SELECT has_table('public', 'jornadas', 'Table public.jornadas exists');
SELECT has_table('public', 'beneficiarios', 'Table public.beneficiarios exists');

SELECT ok(
  (
    SELECT COUNT(*) = 5
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'proyectos',
        'donaciones',
        'comprobantes_gasto',
        'jornadas',
        'beneficiarios'
      )
      AND c.relrowsecurity = TRUE
  ),
  'RLS is enabled on proyectos, donaciones, comprobantes_gasto, jornadas, and beneficiarios'
);

SELECT ok(
  (
    SELECT COUNT(*) = 5
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'proyectos',
        'donaciones',
        'comprobantes_gasto',
        'jornadas',
        'beneficiarios'
      )
      AND c.relforcerowsecurity = TRUE
  ),
  'FORCE ROW LEVEL SECURITY is enabled on core multi-tenant tables'
);

SELECT ok(
  (
    SELECT p.prosecdef = FALSE
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_dashboard_metrics'
    LIMIT 1
  ),
  'public.get_dashboard_metrics() executes as SECURITY INVOKER'
);

SELECT * FROM finish();

ROLLBACK;
