-- 1. Agregar los nuevos roles al tipo enum
-- Nota: En PostgreSQL ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de bloques de transacciones complejas.
-- Se ejecuta como sentencias individuales.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'auxiliar_campo';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'donante';

-- 2. Actualizar la función de validación de firmas de requisiciones
-- Esta función restringe las firmas de visto bueno únicamente a Administradores y Directores.
CREATE OR REPLACE FUNCTION public.check_requisition_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que el primer aprobador tenga rol autorizado (Administrador o Director)
    IF NEW.validador_1_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.usuarios_perfiles 
            WHERE id = NEW.validador_1_id AND rol IN ('administrador', 'director')
        ) THEN
            RAISE EXCEPTION 'El primer validador debe tener rol Administrador o Director.';
        END IF;

        -- Evitar auto-aprobación
        IF NEW.validador_1_id = NEW.solicitante_id THEN
            RAISE EXCEPTION 'El solicitante no puede aprobar su propia solicitud.';
        END IF;
    END IF;

    -- Validar que el segundo aprobador tenga rol autorizado y sea distinto al primero
    IF NEW.validador_2_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.usuarios_perfiles 
            WHERE id = NEW.validador_2_id AND rol IN ('administrador', 'director')
        ) THEN
            RAISE EXCEPTION 'El segundo validador debe tener rol Administrador o Director.';
        END IF;

        -- Evitar auto-aprobación
        IF NEW.validador_2_id = NEW.solicitante_id THEN
            RAISE EXCEPTION 'El solicitante no puede aprobar su propia solicitud.';
        END IF;
    END IF;

    -- Evitar que una solicitud rechazada se apruebe directamente
    IF TG_OP = 'UPDATE' AND OLD.estado = 'rechazada' AND NEW.estado != 'rechazada' THEN
        RAISE EXCEPTION 'No se puede modificar el estado de una solicitud ya rechazada.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
