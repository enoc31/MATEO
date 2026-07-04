-- SQL Patch: Módulo de Solicitudes de Gasto (Requisiciones)
-- Implementa la tabla de solicitudes, la doble firma mancomunada y la reserva presupuestaria (monto comprometido).

-- 1. Crear tipo ENUM para estados de solicitud si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisition_status') THEN
        CREATE TYPE public.requisition_status AS ENUM (
            'pendiente_aprobacion_1',
            'pendiente_aprobacion_2',
            'aprobada_ejecucion',
            'rechazada'
        );
    END IF;
END
$$;

-- 2. Crear Tabla de Solicitudes de Gasto
CREATE TABLE IF NOT EXISTS public.solicitudes_gasto (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    solicitante_id UUID REFERENCES public.usuarios_perfiles(id) ON DELETE CASCADE NOT NULL,
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE RESTRICT NOT NULL,
    categoria_id UUID REFERENCES public.categorias_gasto(id) ON DELETE RESTRICT NOT NULL,
    monto_solicitado NUMERIC(15, 2) NOT NULL CHECK (monto_solicitado > 0),
    motivo TEXT NOT NULL,
    estado public.requisition_status DEFAULT 'pendiente_aprobacion_1' NOT NULL,
    
    -- Validadores (Doble Aprobación)
    validador_1_id UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
    validado_1_at TIMESTAMP WITH TIME ZONE,
    validador_2_id UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
    validado_2_at TIMESTAMP WITH TIME ZONE,
    
    -- Rechazo
    rechazado_por UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
    rechazado_at TIMESTAMP WITH TIME ZONE,
    motivo_rechazo TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Restricción básica de nivel de BD: los validadores deben ser distintos
    CONSTRAINT check_distinct_validators CHECK (
        validador_1_id IS NULL OR 
        validador_2_id IS NULL OR 
        validador_1_id <> validador_2_id
    )
);

-- 3. Añadir relación en Comprobantes de Gasto
ALTER TABLE public.comprobantes_gasto 
ADD COLUMN IF NOT EXISTS solicitud_id UUID REFERENCES public.solicitudes_gasto(id) ON DELETE SET NULL;

-- 4. Añadir columna monto_comprometido a presupuestos
ALTER TABLE public.presupuestos 
ADD COLUMN IF NOT EXISTS monto_comprometido NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (monto_comprometido >= 0);

-- 5. Trigger 1: Validar Roles de Aprobadores y Segregación de Funciones
CREATE OR REPLACE FUNCTION public.check_requisition_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que el primer aprobador tenga rol autorizado
    IF NEW.validador_1_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.usuarios_perfiles 
            WHERE id = NEW.validador_1_id AND rol IN ('administrador', 'auditor')
        ) THEN
            RAISE EXCEPTION 'El primer validador debe tener rol Administrador o Auditor.';
        END IF;

        -- No auto-aprobación
        IF NEW.validador_1_id = NEW.solicitante_id THEN
            RAISE EXCEPTION 'El solicitante no puede aprobar su propia solicitud.';
        END IF;
    END IF;

    -- Validar que el segundo aprobador tenga rol autorizado y sea distinto al primero
    IF NEW.validador_2_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.usuarios_perfiles 
            WHERE id = NEW.validador_2_id AND rol IN ('administrador', 'auditor')
        ) THEN
            RAISE EXCEPTION 'El segundo validador debe tener rol Administrador o Auditor.';
        END IF;

        -- No auto-aprobación
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

DROP TRIGGER IF EXISTS tr_check_requisition_rules ON public.solicitudes_gasto;
CREATE TRIGGER tr_check_requisition_rules
    BEFORE INSERT OR UPDATE ON public.solicitudes_gasto
    FOR EACH ROW EXECUTE FUNCTION public.check_requisition_rules();

-- 6. Trigger 2: Reservar presupuesto cuando pasa a 'aprobada_ejecucion'
CREATE OR REPLACE FUNCTION public.sync_presupuesto_requisicion()
RETURNS TRIGGER AS $$
DECLARE
    v_periodo TEXT;
BEGIN
    v_periodo := TO_CHAR(NEW.created_at, 'YYYY') || '-ANUAL';

    -- Si pasa a aprobada_ejecucion, sumar a monto_comprometido
    IF NEW.estado = 'aprobada_ejecucion' AND OLD.estado != 'aprobada_ejecucion' THEN
        UPDATE public.presupuestos
        SET monto_comprometido = monto_comprometido + NEW.monto_solicitado,
            updated_at = NOW()
        WHERE proyecto_id = NEW.proyecto_id 
          AND categoria_id = NEW.categoria_id 
          AND periodo = v_periodo;
          
    -- Si es rechazada tras haber estado aprobada (ej. anulación administrativa)
    ELSIF NEW.estado = 'rechazada' AND OLD.estado = 'aprobada_ejecucion' THEN
        UPDATE public.presupuestos
        SET monto_comprometido = GREATEST(0.00, monto_comprometido - OLD.monto_solicitado),
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id 
          AND categoria_id = OLD.categoria_id 
          AND periodo = v_periodo;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_presupuesto_requisicion ON public.solicitudes_gasto;
CREATE TRIGGER tr_sync_presupuesto_requisicion
    AFTER UPDATE ON public.solicitudes_gasto
    FOR EACH ROW EXECUTE FUNCTION public.sync_presupuesto_requisicion();

-- 7. Trigger 3: Liberar el comprometido cuando se aprueba el comprobante final y sumar a ejecutado
CREATE OR REPLACE FUNCTION public.update_presupuesto_ejecutado()
RETURNS TRIGGER AS $$
DECLARE
    v_periodo TEXT;
    v_monto_solicitado NUMERIC(15, 2);
BEGIN
    v_periodo := TO_CHAR(COALESCE(NEW.fecha_gasto, OLD.fecha_gasto), 'YYYY') || '-ANUAL';

    -- GASTO APROBADO: Sumamos al ejecutado
    IF (TG_OP = 'INSERT' AND NEW.estado = 'aprobado') OR 
       (TG_OP = 'UPDATE' AND NEW.estado = 'aprobado' AND OLD.estado != 'aprobado') THEN
        
        UPDATE public.presupuestos
        SET monto_ejecutado = monto_ejecutado + NEW.monto,
            updated_at = NOW()
        WHERE proyecto_id = NEW.proyecto_id 
          AND categoria_id = NEW.categoria_id 
          AND periodo = v_periodo;

        -- Si proviene de una requisición, restamos del monto comprometido original
        IF NEW.solicitud_id IS NOT NULL THEN
            SELECT monto_solicitado INTO v_monto_solicitado FROM public.solicitudes_gasto WHERE id = NEW.solicitud_id;
            
            IF v_monto_solicitado IS NOT NULL THEN
                UPDATE public.presupuestos
                SET monto_comprometido = GREATEST(0.00, monto_comprometido - v_monto_solicitado),
                    updated_at = NOW()
                WHERE proyecto_id = NEW.proyecto_id 
                  AND categoria_id = NEW.categoria_id 
                  AND periodo = v_periodo;
            END IF;
        END IF;
          
    -- GASTO ANULADO/ELIMINADO: Restamos de ejecutado
    ELSIF (TG_OP = 'UPDATE' AND OLD.estado = 'aprobado' AND NEW.estado != 'aprobado') THEN
        UPDATE public.presupuestos
        SET monto_ejecutado = GREATEST(0.00, monto_ejecutado - OLD.monto),
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id 
          AND categoria_id = OLD.categoria_id 
          AND periodo = v_periodo;

        -- Si proviene de una requisición y se anula la aprobación del gasto, volvemos a comprometer el monto
        IF OLD.solicitud_id IS NOT NULL THEN
            SELECT monto_solicitado INTO v_monto_solicitado FROM public.solicitudes_gasto WHERE id = OLD.solicitud_id;
            IF v_monto_solicitado IS NOT NULL THEN
                UPDATE public.presupuestos
                SET monto_comprometido = monto_comprometido + v_monto_solicitado,
                    updated_at = NOW()
                WHERE proyecto_id = OLD.proyecto_id 
                  AND categoria_id = OLD.categoria_id 
                  AND periodo = v_periodo;
            END IF;
        END IF;
          
    ELSIF (TG_OP = 'DELETE' AND OLD.estado = 'aprobado') THEN
        UPDATE public.presupuestos
        SET monto_ejecutado = GREATEST(0.00, monto_ejecutado - OLD.monto),
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id 
          AND categoria_id = OLD.categoria_id 
          AND periodo = v_periodo;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Activar RLS en solicitudes_gasto
ALTER TABLE public.solicitudes_gasto ENABLE ROW LEVEL SECURITY;

-- 9. Crear Políticas de Seguridad
DROP POLICY IF EXISTS "Visualización de solicitudes según rol" ON public.solicitudes_gasto;
CREATE POLICY "Visualización de solicitudes según rol"
    ON public.solicitudes_gasto FOR SELECT TO authenticated
    USING (
        auth.uid() = solicitante_id OR 
        EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor'))
    );

DROP POLICY IF EXISTS "Coordinadores pueden crear solicitudes" ON public.solicitudes_gasto;
CREATE POLICY "Coordinadores pueden crear solicitudes"
    ON public.solicitudes_gasto FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = solicitante_id AND
        EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('coordinador', 'administrador'))
    );

DROP POLICY IF EXISTS "Auditores y Administradores pueden aprobar o rechazar solicitudes" ON public.solicitudes_gasto;
CREATE POLICY "Auditores y Administradores pueden aprobar o rechazar solicitudes"
    ON public.solicitudes_gasto FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor'))
    );
