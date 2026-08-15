-- =========================================================================
-- LIMPIEZA SEGURA DE ONGS (CONSERVANDO ÚNICAMENTE "Rosa Prueba")
-- =========================================================================

-- 1. Eliminar invitaciones asociadas a otras ONGs
DELETE FROM public.invitaciones
WHERE ong_id IN (
  SELECT id FROM public.ongs WHERE nombre NOT ILIKE '%Rosa Prueba%'
);

-- 2. Eliminar tasas BCV asociadas a otras ONGs
DELETE FROM public.tasas_bcv
WHERE ong_id IN (
  SELECT id FROM public.ongs WHERE nombre NOT ILIKE '%Rosa Prueba%'
);

-- 3. Eliminar usuarios en auth.users pertenecientes a las ONGs a borrar (respetando SuperAdmins)
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.usuarios_perfiles 
  WHERE ong_id IN (SELECT id FROM public.ongs WHERE nombre NOT ILIKE '%Rosa Prueba%')
    AND rol != 'super_admin'
);

-- 4. Eliminar las ONGs distintas a "Rosa Prueba" (PostgreSQL eliminará en cascada sus proyectos, presupuestos y gastos)
DELETE FROM public.ongs
WHERE nombre NOT ILIKE '%Rosa Prueba%';

-- 5. Recargar esquema en PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
