-- 1. Agregar columna de porcentaje de indirectos configurable en proyectos
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS overhead_porcentaje NUMERIC(5,2) DEFAULT 7.00;

-- 2. Limpiar categorías de gastos existentes para asegurar alineación con UNDG
-- Nota: En una BD con datos en producción esto requiere migración cuidadosa, 
-- pero para este entorno de desarrollo/pilotaje lo re-inicializamos.
DELETE FROM public.comprobantes_gasto;
DELETE FROM public.solicitudes_gasto;
DELETE FROM public.presupuestos;
DELETE FROM public.categorias_gasto;

-- 3. Insertar las 5 Categorías Principales del Modelo UNDG
INSERT INTO public.categorias_gasto (id, nombre, descripcion) VALUES
('c1000000-0000-0000-0000-000000000001', '1. Costos Directos de Intervención (Bienes y Servicios)', 'Compra y distribución de bienes de ayuda y atención humanitaria directa.'),
('c2000000-0000-0000-0000-000000000002', '2. Costos de Transporte, Logística y Almacenamiento', 'Fletes, almacenamiento y movilización local de suministros de ayuda.'),
('c3000000-0000-0000-0000-000000000003', '3. Costos de Personal (Recursos Humanos)', 'Salarios, honorarios y pólizas de seguros del personal asignado.'),
('c4000000-0000-0000-0000-000000000004', '4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)', 'Costos operativos de bases de campo, seguridad y gastos indirectos (overhead).'),
('c5000000-0000-0000-0000-000000000005', '5. Visibilidad, Monitoreo y Evaluación', 'Reportes obligatorios, rendición de cuentas, auditorías y material de visibilidad de donantes.');

-- 4. Crear la Tabla de Partidas de Gasto (Line Items)
CREATE TABLE IF NOT EXISTS public.partidas_gasto (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    categoria_id UUID REFERENCES public.categorias_gasto(id) ON DELETE CASCADE NOT NULL,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_categoria_partida UNIQUE (categoria_id, nombre),
    CONSTRAINT unique_codigo UNIQUE (codigo)
);

-- Habilitar RLS para partidas_gasto
ALTER TABLE public.partidas_gasto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de partidas a todos los autenticados" 
    ON public.partidas_gasto FOR SELECT TO authenticated USING (true);

-- 5. Sembrar Catálogo de 17 Partidas Oficiales del Modelo UNDG
INSERT INTO public.partidas_gasto (id, categoria_id, codigo, nombre, descripcion) VALUES
-- Categoría 1
('a1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000001', '1.1', 'Artículos No Alimentarios (NFI)', 'Compra y distribución de kits de emergencia, lonas, carpas, mantas, utensilios.'),
('a1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000001', '1.2', 'Agua, Saneamiento e Higiene (WASH)', 'Letrinas de emergencia, pastillas potabilizadoras, camiones cisterna, kits de higiene.'),
('a1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000001', '1.3', 'Asistencia Sanitaria de Urgencia', 'Medicamentos esenciales, clínicas móviles, insumos de trauma, generadores de clínicas.'),
('a1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000001', '1.4', 'Seguridad Alimentaria y Nutrición', 'Alimentos de primera necesidad y suplementos nutricionales.'),
('a1000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000001', '1.5', 'Programas de Transferencias Monetarias (PTM)', 'Dinero en efectivo o vales entregados directamente a beneficiarios.'),

-- Categoría 2
('a2000000-0000-0000-0000-000000000021', 'c2000000-0000-0000-0000-000000000002', '2.1', 'Transporte y Envíos', 'Fletes terrestres, marítimos o aéreos para movilizar la ayuda a las zonas afectadas.'),
('a2000000-0000-0000-0000-000000000022', 'c2000000-0000-0000-0000-000000000002', '2.2', 'Almacenamiento', 'Alquiler de bodegas, almacenes temporales y costos de estiba.'),
('a2000000-0000-0000-0000-000000000023', 'c2000000-0000-0000-0000-000000000002', '2.3', 'Logística Local', 'Combustible local, peajes, alquiler de vehículos 4x4 de operación.'),

-- Categoría 3
('a3000000-0000-0000-0000-000000000031', 'c3000000-0000-0000-0000-000000000003', '3.1', 'Personal Local e Internacional', 'Salarios y dietas de coordinadores, médicos, ingenieros WASH y logistas.'),
('a3000000-0000-0000-0000-000000000032', 'c3000000-0000-0000-0000-000000000003', '3.2', 'Seguridad Social y Seguros', 'Pólizas de seguro médico y accidentes de riesgo especial para zonas de desastre.'),

-- Categoría 4
('a4000000-0000-0000-0000-000000000041', 'c4000000-0000-0000-0000-000000000004', '4.1', 'Costos de Oficina sobre el Terreno', 'Alquiler de oficinas/bases, internet satelital, luz, agua y papelería contable.'),
('a4000000-0000-0000-0000-000000000042', 'c4000000-0000-0000-0000-000000000004', '4.2', 'Gestión de Seguridad', 'Equipamiento de comunicación (radios VHF), personal de vigilancia, kits de evacuación.'),
('a4000000-0000-0000-0000-000000000043', 'c4000000-0000-0000-0000-000000000004', '4.3', 'Costos Indirectos (Overhead)', 'Porcentaje destinado a gastos centrales de administración y contabilidad general.'),

-- Categoría 5
('a5000000-0000-0000-0000-000000000051', 'c5000000-0000-0000-0000-000000000005', '5.1', 'Visibilidad', 'Banners, chalecos identificadores de personal, y calcomanías para logos de donantes.'),
('a5000000-0000-0000-0000-000000000052', 'c5000000-0000-0000-0000-000000000005', '5.2', 'Monitoreo, Evaluación y Rendición de Cuentas', 'Viajes de control de hitos, auditorías del proyecto y elaboración de reportes de impacto.');

-- 6. Modificar tablas de negocio para apuntar a Partidas en vez de Categorías

-- A. PRESUPUESTOS
ALTER TABLE public.presupuestos DROP CONSTRAINT IF EXISTS unique_proyecto_categoria_periodo;
ALTER TABLE public.presupuestos DROP COLUMN IF EXISTS categoria_id;
ALTER TABLE public.presupuestos ADD COLUMN partida_id UUID REFERENCES public.partidas_gasto(id) ON DELETE CASCADE;
-- Rellenar temporalmente por si hiciera falta, pero al estar vacía la tabla no habrá conflictos.
ALTER TABLE public.presupuestos ALTER COLUMN partida_id SET NOT NULL;
ALTER TABLE public.presupuestos ADD CONSTRAINT unique_proyecto_partida_periodo UNIQUE (proyecto_id, partida_id, periodo);

-- B. COMPROBANTES DE GASTO
ALTER TABLE public.comprobantes_gasto DROP COLUMN IF EXISTS categoria_id;
ALTER TABLE public.comprobantes_gasto ADD COLUMN partida_id UUID REFERENCES public.partidas_gasto(id) ON DELETE RESTRICT;
ALTER TABLE public.comprobantes_gasto ALTER COLUMN partida_id SET NOT NULL;

-- C. SOLICITUDES DE GASTO
ALTER TABLE public.solicitudes_gasto DROP COLUMN IF EXISTS categoria_id;
ALTER TABLE public.solicitudes_gasto ADD COLUMN partida_id UUID REFERENCES public.partidas_gasto(id) ON DELETE RESTRICT;
ALTER TABLE public.solicitudes_gasto ALTER COLUMN partida_id SET NOT NULL;

-- 7. Actualizar funciones trigger y automatizaciones de montos

-- A. Trigger update_presupuesto_ejecutado (en comprobantes_gasto)
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
          AND partida_id = NEW.partida_id 
          AND periodo = v_periodo;

        -- Si proviene de una requisición, restamos del monto comprometido original
        IF NEW.solicitud_id IS NOT NULL THEN
            SELECT monto_solicitado INTO v_monto_solicitado FROM public.solicitudes_gasto WHERE id = NEW.solicitud_id;
            
            IF v_monto_solicitado IS NOT NULL THEN
                UPDATE public.presupuestos
                SET monto_comprometido = GREATEST(0.00, monto_comprometido - v_monto_solicitado),
                    updated_at = NOW()
                WHERE proyecto_id = NEW.proyecto_id 
                  AND partida_id = NEW.partida_id 
                  AND periodo = v_periodo;
            END IF;
        END IF;
          
    -- GASTO ANULADO/ELIMINADO: Restamos de ejecutado
    ELSIF (TG_OP = 'UPDATE' AND OLD.estado = 'aprobado' AND NEW.estado != 'aprobado') THEN
        UPDATE public.presupuestos
        SET monto_ejecutado = GREATEST(0.00, monto_ejecutado - OLD.monto),
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id 
          AND partida_id = OLD.partida_id 
          AND periodo = v_periodo;

        -- Si proviene de una requisición y se anula la aprobación, re-comprometemos el presupuesto
        IF OLD.solicitud_id IS NOT NULL THEN
            SELECT monto_solicitado INTO v_monto_solicitado FROM public.solicitudes_gasto WHERE id = OLD.solicitud_id;
            IF v_monto_solicitado IS NOT NULL THEN
                UPDATE public.presupuestos
                SET monto_comprometido = monto_comprometido + v_monto_solicitado,
                    updated_at = NOW()
                WHERE proyecto_id = OLD.proyecto_id 
                  AND partida_id = OLD.partida_id 
                  AND periodo = v_periodo;
            END IF;
        END IF;
          
    ELSIF (TG_OP = 'DELETE' AND OLD.estado = 'aprobado') THEN
        UPDATE public.presupuestos
        SET monto_ejecutado = GREATEST(0.00, monto_ejecutado - OLD.monto),
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id 
          AND partida_id = OLD.partida_id 
          AND periodo = v_periodo;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- B. Trigger sync_presupuesto_requisicion (en solicitudes_gasto)
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
          AND partida_id = NEW.partida_id 
          AND periodo = v_periodo;
          
    -- Si es rechazada tras haber estado aprobada
    ELSIF NEW.estado = 'rechazada' AND OLD.estado = 'aprobada_ejecucion' THEN
        UPDATE public.presupuestos
        SET monto_comprometido = GREATEST(0.00, monto_comprometido - OLD.monto_solicitado),
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id 
          AND partida_id = OLD.partida_id 
          AND periodo = v_periodo;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
