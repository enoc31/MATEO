-- =========================================================================
-- SCRIPT DE AUDITORÍA Y RECUPERACIÓN DE DATOS PARA ibccfinanzas@gmail.com
-- =========================================================================
-- Ejecute este script en el Editor SQL de Supabase (SQL Editor) para
-- diagnosticar y solucionar el incidente de inaccesibilidad de miembros cargados.

-- -------------------------------------------------------------------------
-- PASO 1: AUDITORÍA DEL USUARIO Y SU ORGANIZACIÓN VINCULADA
-- -------------------------------------------------------------------------
SELECT 
    u.id AS auth_user_id,
    u.email,
    p.nombre_completo,
    p.rol,
    p.ong_id AS profile_ong_id,
    o.nombre AS ong_nombre,
    o.tipo_organizacion
FROM auth.users u
LEFT JOIN public.usuarios_perfiles p ON p.id = u.id
LEFT JOIN public.ongs o ON o.id = p.ong_id
WHERE u.email ILIKE '%ibccfinanzas%';

-- -------------------------------------------------------------------------
-- PASO 2: CONTEO DE MIEMBROS/BENEFICIARIOS POR ONG Y HUÉRFANOS (ong_id IS NULL)
-- -------------------------------------------------------------------------
SELECT 
    COALESCE(b.ong_id::text, 'SIN_ONG_ASIGNADA') AS ong_id,
    COALESCE(o.nombre, 'Sin Organización / Huérfanos') AS ong_nombre,
    COUNT(*) AS total_miembros_cargados
FROM public.beneficiarios b
LEFT JOIN public.ongs o ON o.id = b.ong_id
GROUP BY b.ong_id, o.nombre;

-- -------------------------------------------------------------------------
-- PASO 3: INSPECCIONAR ÚLTIMOS MIEMBROS REGISTRADOS EN LA BASE DE DATOS
-- -------------------------------------------------------------------------
SELECT 
    id,
    nombre,
    apellido,
    cedula,
    ong_id,
    jornada_id,
    created_at
FROM public.beneficiarios
ORDER BY created_at DESC
LIMIT 20;

-- -------------------------------------------------------------------------
-- PASO 4: RECUPERACIÓN AUTOMÁTICA (REASIGNAR REGISTROS HUÉRFANOS A IBCC)
-- -------------------------------------------------------------------------
DO $$
DECLARE
    v_user_ong_id UUID;
BEGIN
    -- Obtener la ONG activa del usuario ibccfinanzas@gmail.com
    SELECT p.ong_id INTO v_user_ong_id
    FROM public.usuarios_perfiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email ILIKE '%ibccfinanzas%'
    LIMIT 1;

    IF v_user_ong_id IS NOT NULL THEN
        -- 1. Reasignar beneficiarios sin ong_id a la ONG de IBCC
        UPDATE public.beneficiarios
        SET ong_id = v_user_ong_id
        WHERE ong_id IS NULL;

        -- 2. Asegurar que exista una jornada activa asociada a esa ONG
        UPDATE public.jornadas
        SET ong_id = v_user_ong_id
        WHERE ong_id IS NULL AND nombre ILIKE '%Ekklesia%';

        RAISE NOTICE 'Reasignación completada con exito para la ONG ID %', v_user_ong_id;
    ELSE
        RAISE NOTICE 'No se encontró una ONG asociada para ibccfinanzas@gmail.com. Por favor cree la ONG o asigne el perfil.';
    END IF;
END $$;
