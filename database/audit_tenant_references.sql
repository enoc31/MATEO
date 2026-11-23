-- Read-only preflight for 20261123000000_enforce_tenant_references.sql.
-- Run with an authorized administrative database role against staging first.
-- Counts only; no personal or financial values are returned.
SELECT 'donaciones.miembro_id' AS referencia, count(*) AS inconsistencias
FROM public.donaciones d LEFT JOIN public.beneficiarios x ON x.id = d.miembro_id
WHERE d.miembro_id IS NOT NULL AND x.ong_id IS DISTINCT FROM d.ong_id
UNION ALL
SELECT 'donaciones.cuenta_receptora_id', count(*)
FROM public.donaciones d LEFT JOIN public.cuentas_receptoras_iglesia x ON x.id = d.cuenta_receptora_id
WHERE d.cuenta_receptora_id IS NOT NULL AND x.ong_id IS DISTINCT FROM d.ong_id
UNION ALL
SELECT 'donaciones.reporte_origen_id', count(*)
FROM public.donaciones d LEFT JOIN public.reportes_aportes x ON x.id = d.reporte_origen_id
WHERE d.reporte_origen_id IS NOT NULL AND x.ong_id IS DISTINCT FROM d.ong_id
UNION ALL
SELECT 'donaciones.proyecto_id', count(*)
FROM public.donaciones d LEFT JOIN public.proyectos x ON x.id = d.proyecto_id
WHERE d.proyecto_id IS NOT NULL AND x.ong_id IS DISTINCT FROM d.ong_id
UNION ALL
SELECT 'donaciones.transaccion_id', count(*)
FROM public.donaciones d LEFT JOIN public.transacciones_bancarias x ON x.id = d.transaccion_id
WHERE d.transaccion_id IS NOT NULL AND x.ong_id IS DISTINCT FROM d.ong_id
UNION ALL
SELECT 'donaciones.created_by', count(*)
FROM public.donaciones d LEFT JOIN public.usuarios_perfiles x ON x.id = d.created_by
WHERE d.created_by IS NOT NULL AND x.ong_id IS DISTINCT FROM d.ong_id
UNION ALL
SELECT 'comprobantes_gasto.proyecto_partida', count(*)
FROM public.comprobantes_gasto c
LEFT JOIN public.proyectos p ON p.id = c.proyecto_id AND p.ong_id = c.ong_id
LEFT JOIN public.proyectos_partidas pp ON pp.proyecto_id = c.proyecto_id AND pp.partida_id = c.partida_id AND pp.ong_id = c.ong_id
WHERE p.id IS NULL OR pp.proyecto_id IS NULL
UNION ALL
SELECT 'comprobantes_gasto.solicitud_id', count(*)
FROM public.comprobantes_gasto c LEFT JOIN public.solicitudes_gasto x ON x.id = c.solicitud_id
WHERE c.solicitud_id IS NOT NULL AND (x.ong_id IS DISTINCT FROM c.ong_id OR x.proyecto_id IS DISTINCT FROM c.proyecto_id OR x.partida_id IS DISTINCT FROM c.partida_id)
UNION ALL
SELECT 'comprobantes_gasto.transaccion_id', count(*)
FROM public.comprobantes_gasto c LEFT JOIN public.transacciones_bancarias x ON x.id = c.transaccion_id
WHERE c.transaccion_id IS NOT NULL AND x.ong_id IS DISTINCT FROM c.ong_id
UNION ALL
SELECT 'comprobantes_gasto.solicitante_id', count(*)
FROM public.comprobantes_gasto c LEFT JOIN public.usuarios_perfiles x ON x.id = c.solicitante_id
WHERE x.ong_id IS DISTINCT FROM c.ong_id
UNION ALL
SELECT 'comprobantes_gasto.auditado_por', count(*)
FROM public.comprobantes_gasto c LEFT JOIN public.usuarios_perfiles x ON x.id = c.auditado_por
WHERE c.auditado_por IS NOT NULL AND x.ong_id IS DISTINCT FROM c.ong_id;
