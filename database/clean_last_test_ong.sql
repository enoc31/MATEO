-- =========================================================================
-- LIMPIEZA DE ÚLTIMA ONG Y USUARIOS DE PRUEBA EN SUPABASE
-- =========================================================================

-- 1. Eliminar invitaciones de prueba recientes
DELETE FROM public.invitaciones
WHERE created_at > (NOW() - INTERVAL '1 day');

-- 2. Eliminar usuarios de prueba creados recientemente en usuarios_perfiles y auth.users
DELETE FROM public.usuarios_perfiles
WHERE created_at > (NOW() - INTERVAL '1 day')
  AND email NOT IN ('admin@cnbv.org', 'director@cnbv.org', 'auditor@cnbv.org', 'superadmin@cnbv.org');

-- Eliminar usuarios correspondientes en auth.users
DELETE FROM auth.users
WHERE created_at > (NOW() - INTERVAL '1 day')
  AND email NOT IN ('admin@cnbv.org', 'director@cnbv.org', 'auditor@cnbv.org', 'superadmin@cnbv.org');

-- 3. Eliminar ONGs de prueba registradas recientemente (excepto la ONG demo por defecto)
DELETE FROM public.ongs
WHERE created_at > (NOW() - INTERVAL '1 day')
  AND id != '11111111-1111-1111-1111-111111111111';

NOTIFY pgrst, 'reload schema';
