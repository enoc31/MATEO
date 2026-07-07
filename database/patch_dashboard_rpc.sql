-- =========================================================================
-- Parche SQL: Función RPC para Optimizar el Dashboard
-- =========================================================================

CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_inflows numeric := 0;
  reconciled_inflows numeric := 0;
  unreconciled_inflows numeric := 0;
  total_outflows numeric := 0;
  expenses_by_category json;
  project_execution json;
BEGIN
  -- 1. Cálculos de Ingresos (Donaciones)
  SELECT 
    COALESCE(SUM(COALESCE(monto_usd, monto)), 0),
    COALESCE(SUM(CASE WHEN transaccion_id IS NOT NULL THEN COALESCE(monto_usd, monto) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaccion_id IS NULL THEN COALESCE(monto_usd, monto) ELSE 0 END), 0)
  INTO total_inflows, reconciled_inflows, unreconciled_inflows
  FROM public.donaciones;

  -- 2. Cálculos de Egresos Aprobados
  SELECT COALESCE(SUM(monto), 0) INTO total_outflows
  FROM public.comprobantes_gasto
  WHERE estado = 'aprobado';

  -- 3. Egresos por Categoría
  SELECT json_object_agg(COALESCE(c.id::text, 'otros'), total_monto)
  INTO expenses_by_category
  FROM (
    SELECT 
      p.categoria_id as id,
      SUM(cg.monto) as total_monto
    FROM public.comprobantes_gasto cg
    LEFT JOIN public.partidas_gasto p ON cg.partida_id = p.id
    WHERE cg.estado = 'aprobado'
    GROUP BY p.categoria_id
  ) c;

  -- Si no hay gastos, devolver objeto vacío en lugar de null
  IF expenses_by_category IS NULL THEN
    expenses_by_category := '{}'::json;
  END IF;

  -- 4. Ejecución Presupuestaria por Proyecto
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'nombre', p.nombre,
      'Presupuesto', COALESCE(b.asignado, 0),
      'Ejecutado', COALESCE(b.ejecutado, 0)
    )
  )
  INTO project_execution
  FROM public.proyectos p
  LEFT JOIN (
    SELECT 
      proyecto_id, 
      SUM(monto_asignado) as asignado, 
      SUM(monto_ejecutado) as ejecutado
    FROM public.presupuestos
    GROUP BY proyecto_id
  ) b ON p.id = b.proyecto_id
  WHERE p.activo = true OR COALESCE(b.asignado, 0) > 0;

  IF project_execution IS NULL THEN
    project_execution := '[]'::json;
  END IF;

  -- Retornar el objeto JSON consolidado
  RETURN json_build_object(
    'totalInflows', total_inflows,
    'reconciledInflows', reconciled_inflows,
    'unreconciledInflows', unreconciled_inflows,
    'totalOutflows', total_outflows,
    'expensesByCategory', expenses_by_category,
    'projectExecution', project_execution
  );
END;
$$;
