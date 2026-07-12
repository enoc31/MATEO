-- =============================================================================
-- PATCH: patch_rls_hardening.sql
-- Objetivo: Corregir brechas de seguridad de aislamiento entre ONGs.
-- Ejecutar en: Supabase SQL Editor (produccion)
-- Requiere: patch_multitenant.sql ejecutado previamente
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECCION A: Corregir get_dashboard_metrics() - Critico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_ong_id UUID;
  v_total_inflows NUMERIC := 0;
  v_reconciled_inflows NUMERIC := 0;
  v_unreconciled_inflows NUMERIC := 0;
  v_total_outflows NUMERIC := 0;
  v_expenses_by_category JSON := '{}';
  v_project_execution JSON := '[]';
BEGIN
  SELECT ong_id INTO v_ong_id FROM public.usuarios_perfiles WHERE id = auth.uid() LIMIT 1;

  IF v_ong_id IS NULL THEN
    RETURN json_build_object('totalInflows',0,'reconciledInflows',0,'unreconciledInflows',0,'totalOutflows',0,'expensesByCategory','{}','projectExecution','[]');
  END IF;

  SELECT COALESCE(SUM(monto),0) INTO v_total_inflows FROM public.transacciones_bancarias WHERE monto>0 AND ong_id=v_ong_id;
  SELECT COALESCE(SUM(monto),0) INTO v_reconciled_inflows FROM public.transacciones_bancarias WHERE monto>0 AND estado='conciliado' AND ong_id=v_ong_id;
  v_unreconciled_inflows := v_total_inflows - v_reconciled_inflows;
  SELECT COALESCE(SUM(monto),0) INTO v_total_outflows FROM public.comprobantes_gasto WHERE estado='aprobado' AND ong_id=v_ong_id;

  SELECT COALESCE(json_object_agg(cat.nombre,cat.cat_total),'{}') INTO v_expenses_by_category
  FROM (
    SELECT cg.nombre, COALESCE(SUM(eg.monto),0) AS cat_total
    FROM public.categorias_gasto cg
    LEFT JOIN public.partidas_gasto pg ON pg.categoria_id=cg.id
    LEFT JOIN public.comprobantes_gasto eg ON eg.partida_id=pg.id AND eg.estado='aprobado' AND eg.ong_id=v_ong_id
    GROUP BY cg.nombre
  ) cat;

  SELECT COALESCE(json_agg(json_build_object('nombre',p.nombre,'ejecutado',COALESCE(exec.total,0),'presupuestado',COALESCE(bud.total,0))),'[]') INTO v_project_execution
  FROM public.proyectos p
  LEFT JOIN (SELECT proyecto_id,SUM(monto) AS total FROM public.comprobantes_gasto WHERE estado='aprobado' AND ong_id=v_ong_id GROUP BY proyecto_id) exec ON exec.proyecto_id=p.id
  LEFT JOIN (SELECT proyecto_id,SUM(monto_asignado) AS total FROM public.presupuestos GROUP BY proyecto_id) bud ON bud.proyecto_id=p.id
  WHERE p.ong_id=v_ong_id;

  RETURN json_build_object('totalInflows',v_total_inflows,'reconciledInflows',v_reconciled_inflows,'unreconciledInflows',v_unreconciled_inflows,'totalOutflows',v_total_outflows,'expensesByCategory',v_expenses_by_category,'projectExecution',v_project_execution);
END;
$$;

-- ---------------------------------------------------------------------------
-- SECCION B: Corregir politica de donaciones
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lectura de donaciones para roles autorizados" ON public.donaciones;

CREATE POLICY "Lectura de donaciones por ong y rol" ON public.donaciones
  FOR SELECT
  USING (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador','auditor','director','coordinador','super_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- SECCION C: Trigger automatico de ong_id para tablas transaccionales
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_ong_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ong_id UUID;
BEGIN
  IF NEW.ong_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT ong_id INTO v_ong_id FROM public.usuarios_perfiles WHERE id = auth.uid() LIMIT 1;
  IF v_ong_id IS NOT NULL THEN NEW.ong_id := v_ong_id; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['proyectos','presupuestos','comprobantes_gasto','donaciones','transacciones_bancarias','jornadas','beneficiarios','solicitudes_gasto','documentos_adjuntos','donantes'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_ong_id ON public.%I', t);
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='ong_id') THEN
        EXECUTE format('CREATE TRIGGER trg_set_ong_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_ong_id_from_user()', t);
        RAISE NOTICE 'Trigger created on: %', t;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- SECCION D: Verificacion
-- ---------------------------------------------------------------------------
SELECT proname, prosecdef AS is_security_definer FROM pg_proc WHERE proname='get_dashboard_metrics' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name='trg_set_ong_id' AND trigger_schema='public' ORDER BY event_object_table;
SELECT COUNT(*) AS proyectos_sin_ong FROM public.proyectos WHERE ong_id IS NULL;
SELECT COUNT(*) AS donaciones_sin_ong FROM public.donaciones WHERE ong_id IS NULL;
