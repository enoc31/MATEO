-- =========================================================================
-- DIAGNÓSTICO COMPLETO DE TABLAS EN SUPABASE (RESISTENTE A ESQUEMAS)
-- =========================================================================

-- 1. Recuento general de registros por tabla en public y auth
SELECT 'ongs' AS tabla, COUNT(*) AS total_registros FROM public.ongs
UNION ALL
SELECT 'usuarios_perfiles' AS tabla, COUNT(*) AS total_registros FROM public.usuarios_perfiles
UNION ALL
SELECT 'auth.users' AS tabla, COUNT(*) AS total_registros FROM auth.users
UNION ALL
SELECT 'proyectos' AS tabla, COUNT(*) AS total_registros FROM public.proyectos
UNION ALL
SELECT 'donaciones' AS tabla, COUNT(*) AS total_registros FROM public.donaciones
UNION ALL
SELECT 'solicitudes_gasto' AS tabla, COUNT(*) AS total_registros FROM public.solicitudes_gasto
UNION ALL
SELECT 'comprobantes_gasto' AS tabla, COUNT(*) AS total_registros FROM public.comprobantes_gasto
UNION ALL
SELECT 'invitaciones' AS tabla, COUNT(*) AS total_registros FROM public.invitaciones;

-- 2. Mostrar todas las ONGs registradas
SELECT * FROM public.ongs ORDER BY created_at DESC;

-- 3. Mostrar todos los usuarios registrados
SELECT * FROM public.usuarios_perfiles ORDER BY created_at DESC;
