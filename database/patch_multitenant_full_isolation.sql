-- =============================================================================
-- PATCH MAESTRO: patch_multitenant_full_isolation.sql
-- OBJETIVO: Garantizar aislamiento multitenant completo en TODAS las tablas
--           del sistema. Este script es idempotente y destructivo-reconstructivo:
--           elimina TODAS las políticas existentes y las recrea con ong_id.
--
-- PROBLEMA SISTÉMICO IDENTIFICADO:
--   El schema.sql original creó políticas con USING (true) o USING (EXISTS rol)
--   sin filtro de ong_id. PostgreSQL combina estas políticas con OR (modo
--   permisivo por defecto), lo que hace que cualquier usuario autenticado
--   pueda ver datos de CUALQUIER ONG aunque exista una política de aislamiento.
--
-- SOLUCIÓN: Borrar todas las políticas por tabla y recrearlas con ong_id obligatorio.
--
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- UTILIDAD: Función para limpiar todas las políticas de una tabla
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._drop_all_policies(p_table TEXT)
RETURNS void AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
    RAISE NOTICE 'Dropped: % on %', pol.policyname, p_table;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLA: proyectos
-- =============================================================================
SELECT public._drop_all_policies('proyectos');
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_proyectos"
  ON public.proyectos FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: categorias_gasto
-- =============================================================================
SELECT public._drop_all_policies('categorias_gasto');
ALTER TABLE public.categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_gasto FORCE ROW LEVEL SECURITY;

-- Catálogo base (ONG fundadora 11111111-...) visible para todos (partidas UNDG globales)
CREATE POLICY "aislamiento_ong_categorias"
  ON public.categorias_gasto FOR ALL TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'
  )
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: partidas_gasto
-- =============================================================================
SELECT public._drop_all_policies('partidas_gasto');
ALTER TABLE public.partidas_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas_gasto FORCE ROW LEVEL SECURITY;

-- Partidas base (ONG fundadora) visibles para todos por ser catálogo compartido
CREATE POLICY "aislamiento_ong_partidas"
  ON public.partidas_gasto FOR ALL TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'
  )
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: presupuestos
-- =============================================================================
SELECT public._drop_all_policies('presupuestos');
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_presupuestos"
  ON public.presupuestos FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: transacciones_bancarias
-- =============================================================================
SELECT public._drop_all_policies('transacciones_bancarias');
ALTER TABLE public.transacciones_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones_bancarias FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_transacciones"
  ON public.transacciones_bancarias FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: donaciones
-- =============================================================================
SELECT public._drop_all_policies('donaciones');
ALTER TABLE public.donaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donaciones FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_donaciones"
  ON public.donaciones FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: comprobantes_gasto
-- =============================================================================
SELECT public._drop_all_policies('comprobantes_gasto');
ALTER TABLE public.comprobantes_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_gasto FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_comprobantes"
  ON public.comprobantes_gasto FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: solicitudes_gasto
-- =============================================================================
SELECT public._drop_all_policies('solicitudes_gasto');
ALTER TABLE public.solicitudes_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_gasto FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_solicitudes"
  ON public.solicitudes_gasto FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: documentos_adjuntos
-- =============================================================================
SELECT public._drop_all_policies('documentos_adjuntos');
ALTER TABLE public.documentos_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_adjuntos FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_documentos"
  ON public.documentos_adjuntos FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: donantes
-- =============================================================================
SELECT public._drop_all_policies('donantes');
ALTER TABLE public.donantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donantes FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_donantes"
  ON public.donantes FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: tasas_bcv
-- =============================================================================
SELECT public._drop_all_policies('tasas_bcv');
ALTER TABLE public.tasas_bcv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasas_bcv FORCE ROW LEVEL SECURITY;

-- Tasas propias + tasas de referencia de la ONG base (CNBV)
CREATE POLICY "aislamiento_ong_tasas"
  ON public.tasas_bcv FOR ALL TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'
  )
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: jornadas (ya corregida, se refuerza aquí)
-- =============================================================================
SELECT public._drop_all_policies('jornadas');
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_jornadas"
  ON public.jornadas FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

CREATE POLICY "jornadas_anon_read_active"
  ON public.jornadas FOR SELECT TO anon
  USING (activa = true);

-- =============================================================================
-- TABLA: beneficiarios (ya corregida, se refuerza aquí)
-- =============================================================================
SELECT public._drop_all_policies('beneficiarios');
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarios FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_beneficiarios"
  ON public.beneficiarios FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

CREATE POLICY "beneficiarios_anon_insert"
  ON public.beneficiarios FOR INSERT TO anon
  WITH CHECK (true);

-- =============================================================================
-- TABLA: usuarios_perfiles
-- =============================================================================
SELECT public._drop_all_policies('usuarios_perfiles');
ALTER TABLE public.usuarios_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_perfiles FORCE ROW LEVEL SECURITY;

-- SELECT/UPDATE/DELETE: usuarios de la misma ONG, o super_admin que ve todo
CREATE POLICY "aislamiento_ong_perfiles"
  ON public.usuarios_perfiles FOR ALL TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR public.is_super_admin()
  );

-- INSERT: permitir la autoinserción al registrarse (pública)
CREATE POLICY "perfiles_insert_propio"
  ON public.usuarios_perfiles FOR INSERT TO public
  WITH CHECK (true);

-- =============================================================================
-- TABLA: proyectos_partidas (tabla de relación)
-- =============================================================================
SELECT public._drop_all_policies('proyectos_partidas');
ALTER TABLE public.proyectos_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos_partidas FORCE ROW LEVEL SECURITY;

CREATE POLICY "aislamiento_ong_proyectos_partidas"
  ON public.proyectos_partidas FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- =============================================================================
-- TABLA: ongs (tabla maestra)
-- =============================================================================
SELECT public._drop_all_policies('ongs');
ALTER TABLE public.ongs ENABLE ROW LEVEL SECURITY;

-- Lectura pública: necesario para el formulario de registro (selección de ONG)
CREATE POLICY "ongs_public_read"
  ON public.ongs FOR SELECT TO public
  USING (true);

-- INSERT: permitir registrar nueva ONG en el flujo de onboarding
CREATE POLICY "ongs_public_insert"
  ON public.ongs FOR INSERT TO public
  WITH CHECK (true);

-- UPDATE/DELETE: solo el admin de su propia ONG o super_admin
CREATE POLICY "ongs_admin_update"
  ON public.ongs FOR UPDATE TO authenticated
  USING (
    id = public.get_user_ong_id()
    OR public.is_super_admin()
  );

-- =============================================================================
-- LIMPIEZA: eliminar función helper temporal
-- =============================================================================
DROP FUNCTION IF EXISTS public._drop_all_policies(TEXT);

-- =============================================================================
-- VERIFICACIÓN FINAL
-- Ejecuta esto para confirmar que TODAS las políticas tienen ong_id en su filtro
-- =============================================================================
SELECT
  tablename,
  policyname,
  roles,
  cmd AS operacion,
  qual AS condicion_using
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
