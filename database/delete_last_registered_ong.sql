-- =========================================================================
-- SCRIPT PARA ELIMINAR LA ÚLTIMA ONG REGISTRADA Y SUS USUARIOS/INVITACIONES
-- =========================================================================

DO $$
DECLARE
    target_ong_id UUID;
    target_ong_nombre VARCHAR;
BEGIN
    -- 1. Obtener la última ONG creada (excluyendo la ONG demo por defecto)
    SELECT id, nombre INTO target_ong_id, target_ong_nombre
    FROM public.ongs
    WHERE id != '11111111-1111-1111-1111-111111111111'
    ORDER BY created_at DESC
    LIMIT 1;

    IF target_ong_id IS NOT NULL THEN
        RAISE NOTICE 'Eliminando ONG: % (ID: %)', target_ong_nombre, target_ong_id;

        -- 2. Eliminar invitaciones vinculadas a esta ONG
        DELETE FROM public.invitaciones WHERE ong_id = target_ong_id;

        -- 3. Eliminar usuarios de auth.users vinculados a esta ONG
        DELETE FROM auth.users 
        WHERE id IN (SELECT id FROM public.usuarios_perfiles WHERE ong_id = target_ong_id);

        -- 4. Eliminar perfiles vinculados a esta ONG
        DELETE FROM public.usuarios_perfiles WHERE ong_id = target_ong_id;

        -- 5. Eliminar la ONG objetivo
        DELETE FROM public.ongs WHERE id = target_ong_id;

        RAISE NOTICE 'ONG y usuarios asociados eliminados exitosamente.';
    ELSE
        RAISE NOTICE 'No se encontraron ONGs de prueba para eliminar.';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
