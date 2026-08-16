-- =========================================================================
-- SCRIPT DE LIMPIEZA: ELIMINAR ONG "Gerardo Prueba" Y USUARIO "gherrera@asgmultiplex.com"
-- =========================================================================

DO $$ 
DECLARE 
    target_user_id UUID;
    target_ong_id UUID;
BEGIN
    -- 1. Obtener ID del usuario gherrera@asgmultiplex.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'gherrera@asgmultiplex.com';
    
    -- 2. Obtener ID de la ONG "Gerardo Prueba" (o similar)
    SELECT id INTO target_ong_id 
    FROM public.ongs 
    WHERE nombre ILIKE '%Gerardo Prueba%' OR nombre ILIKE '%Gerardo%';

    -- 3. Eliminar el usuario de perfiles y auth.users
    IF target_user_id IS NOT NULL THEN
        DELETE FROM public.usuarios_perfiles WHERE id = target_user_id;
        DELETE FROM auth.users WHERE id = target_user_id;
        RAISE NOTICE 'Usuario gherrera@asgmultiplex.com eliminado exitosamente.';
    ELSE
        RAISE NOTICE 'El usuario gherrera@asgmultiplex.com no fue encontrado.';
    END IF;

    -- 4. Limpiar datos transaccionales y eliminar la ONG
    IF target_ong_id IS NOT NULL THEN
        DELETE FROM public.solicitudes_gasto WHERE ong_id = target_ong_id;
        DELETE FROM public.comprobantes_gasto WHERE ong_id = target_ong_id;
        DELETE FROM public.transacciones_bancarias WHERE ong_id = target_ong_id;
        DELETE FROM public.proyectos WHERE ong_id = target_ong_id;
        DELETE FROM public.presupuestos WHERE ong_id = target_ong_id;
        DELETE FROM public.donaciones WHERE ong_id = target_ong_id;
        DELETE FROM public.tasas_bcv WHERE ong_id = target_ong_id;
        DELETE FROM public.jornadas WHERE ong_id = target_ong_id;
        DELETE FROM public.beneficiarios WHERE ong_id = target_ong_id;
        DELETE FROM public.invitaciones WHERE ong_id = target_ong_id;
        DELETE FROM public.usuarios_perfiles WHERE ong_id = target_ong_id;
        
        DELETE FROM public.ongs WHERE id = target_ong_id;
        RAISE NOTICE 'Organización Gerardo Prueba eliminada exitosamente.';
    ELSE
        RAISE NOTICE 'La ONG Gerardo Prueba no fue encontrada.';
    END IF;
END $$;
