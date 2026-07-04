-- Esquema de Base de Datos para el Sistema de Auditoría y Conciliación CNBV (Ayuda Humanitaria)
-- Diseñado para ejecutarse en PostgreSQL / Supabase.

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. ENUMS Y ROLES
-- =========================================================================
CREATE TYPE user_role AS ENUM ('administrador', 'auditor', 'coordinador');
CREATE TYPE expense_status AS ENUM ('pendiente_soporte', 'pendiente_revision', 'aprobado', 'rechazado');
CREATE TYPE transaction_status AS ENUM ('pendiente', 'conciliado');

-- =========================================================================
-- 2. TABLAS PRINCIPALES
-- =========================================================================

-- Perfiles de usuarios vinculados al Auth de Supabase
CREATE TABLE public.usuarios_perfiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    nombre_completo TEXT,
    rol user_role NOT NULL DEFAULT 'coordinador',
    aprobado BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Proyectos de ayuda humanitaria coordinados por la CNBV
CREATE TABLE public.proyectos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.usuarios_perfiles(id)
);

-- Categorías de gastos (ej: Alimentación, Medicamentos, Logística, Transporte)
CREATE TABLE public.categorias_gasto (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Presupuestos asignados a proyectos por categoría de gasto
CREATE TABLE public.presupuestos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE CASCADE NOT NULL,
    categoria_id UUID REFERENCES public.categorias_gasto(id) ON DELETE CASCADE NOT NULL,
    monto_asignado NUMERIC(15, 2) NOT NULL CHECK (monto_asignado >= 0),
    monto_ejecutado NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (monto_ejecutado >= 0),
    periodo TEXT NOT NULL, -- Ej: '2026-Q1', '2026-Q2', '2026-ANUAL'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_proyecto_categoria_periodo UNIQUE (proyecto_id, categoria_id, periodo)
);

-- Transacciones bancarias importadas de estados de cuenta en CSV
CREATE TABLE public.transacciones_bancarias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha DATE NOT NULL,
    referencia TEXT,
    descripcion TEXT NOT NULL,
    monto NUMERIC(15, 2) NOT NULL, -- Positivo para ingresos (donaciones), negativo para egresos (gastos)
    estado transaction_status DEFAULT 'pendiente' NOT NULL,
    csv_metadata JSONB, -- Almacena metadatos del archivo importado (ej: fila, nombre_archivo)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    imported_by UUID REFERENCES public.usuarios_perfiles(id)
);

-- Donaciones recibidas (Entradas de dinero ligadas a un movimiento bancario y/o proyecto)
CREATE TABLE public.donaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE SET NULL,
    transaccion_id UUID REFERENCES public.transacciones_bancarias(id) ON DELETE SET NULL,
    donante TEXT DEFAULT 'Anónimo' NOT NULL,
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    descripcion TEXT,
    fecha DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.usuarios_perfiles(id)
);

-- Comprobantes de gastos cargados por usuarios (Egresos / Salidas de dinero)
CREATE TABLE public.comprobantes_gasto (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE RESTRICT NOT NULL,
    categoria_id UUID REFERENCES public.categorias_gasto(id) ON DELETE RESTRICT NOT NULL,
    transaccion_id UUID REFERENCES public.transacciones_bancarias(id) ON DELETE SET NULL, -- Se llena en la conciliación
    solicitante_id UUID REFERENCES public.usuarios_perfiles(id) NOT NULL,
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    descripcion TEXT NOT NULL,
    fecha_gasto DATE NOT NULL,
    url_comprobante TEXT, -- Link a la foto del recibo/factura en el Bucket de Supabase
    estado expense_status DEFAULT 'pendiente_revision' NOT NULL,
    comentarios_auditoria TEXT, -- Observaciones de rechazo o notas de auditoría
    auditado_por UUID REFERENCES public.usuarios_perfiles(id),
    auditado_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================================
-- 3. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- =========================================================================

-- Trigger para crear perfil automáticamente cuando un usuario se registra en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Usuario'),
    COALESCE((new.raw_user_meta_data->>'rol')::user_role, 'coordinador'::user_role),
    FALSE -- Por defecto inicia desaprobado
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar el monto ejecutado del presupuesto cuando un gasto es aprobado
CREATE OR REPLACE FUNCTION public.update_presupuesto_ejecutado()
RETURNS TRIGGER AS $$
DECLARE
    v_periodo TEXT;
BEGIN
    -- Determinar el periodo (ej. año del gasto)
    v_periodo := TO_CHAR(COALESCE(NEW.fecha_gasto, OLD.fecha_gasto), 'YYYY') || '-ANUAL';

    -- Si el gasto cambió a 'aprobado'
    IF (TG_OP = 'INSERT' AND NEW.estado = 'aprobado') OR 
       (TG_OP = 'UPDATE' AND NEW.estado = 'aprobado' AND OLD.estado != 'aprobado') THEN
        
        UPDATE public.presupuestos
        SET monto_ejecutado = monto_ejecutado + NEW.monto,
            updated_at = NOW()
        WHERE proyecto_id = NEW.proyecto_id 
          AND categoria_id = NEW.categoria_id 
          AND periodo = v_periodo;
          
    -- Si el gasto deja de estar 'aprobado' (cambio de estado o eliminación)
    ELSIF (TG_OP = 'UPDATE' AND OLD.estado = 'aprobado' AND NEW.estado != 'aprobado') THEN
        
        UPDATE public.presupuestos
        SET monto_ejecutado = GREATEST(0.00, monto_ejecutado - OLD.monto),
            updated_at = NOW()
        WHERE proyecto_id = OLD.proyecto_id 
          AND categoria_id = OLD.categoria_id 
          AND periodo = v_periodo;
          
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

CREATE OR REPLACE TRIGGER tr_update_presupuesto_ejecutado
    AFTER INSERT OR UPDATE OR DELETE ON public.comprobantes_gasto
    FOR EACH ROW EXECUTE FUNCTION public.update_presupuesto_ejecutado();

-- =========================================================================
-- 4. POLÍTICAS DE SEGURIDAD (RLS)
-- =========================================================================

-- Activar RLS en todas las tablas
ALTER TABLE public.usuarios_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_gasto ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios_perfiles
CREATE POLICY "Permitir lectura de perfiles a todos los usuarios autenticados" 
    ON public.usuarios_perfiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir actualización de perfil propio" 
    ON public.usuarios_perfiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Permitir a administradores actualizar cualquier perfil" 
    ON public.usuarios_perfiles FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador'));

-- Políticas para proyectos
CREATE POLICY "Permitir lectura de proyectos a todos los autenticados"
    ON public.proyectos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo administradores pueden crear o modificar proyectos"
    ON public.proyectos FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador'));

-- Políticas para categorias_gasto
CREATE POLICY "Permitir lectura de categorías a todos los autenticados"
    ON public.categorias_gasto FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo administradores pueden gestionar categorías"
    ON public.categorias_gasto FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador'));

-- Políticas para presupuestos
CREATE POLICY "Permitir lectura de presupuestos a todos los autenticados"
    ON public.presupuestos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo administradores pueden gestionar presupuestos"
    ON public.presupuestos FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador'));

-- Políticas para transacciones_bancarias (CSV)
CREATE POLICY "Lectura de transacciones bancarias para administradores y auditores"
    ON public.transacciones_bancarias FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor')));

CREATE POLICY "Inserción/Modificación de transacciones para administradores y auditores"
    ON public.transacciones_bancarias FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor')));

-- Políticas para donaciones
CREATE POLICY "Lectura de donaciones para administradores y auditores"
    ON public.donaciones FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor')));

CREATE POLICY "Gestión de donaciones para administradores y auditores"
    ON public.donaciones FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor')));

-- Políticas para comprobantes_gasto
CREATE POLICY "Lectura de comprobantes: Coordinadores ven los suyos, Auditores/Admin ven todo"
    ON public.comprobantes_gasto FOR SELECT TO authenticated 
    USING (
        auth.uid() = solicitante_id OR 
        EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor'))
    );

CREATE POLICY "Coordinadores pueden insertar comprobantes"
    ON public.comprobantes_gasto FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Coordinadores pueden modificar sus comprobantes pendientes de soporte/revisión"
    ON public.comprobantes_gasto FOR UPDATE TO authenticated 
    USING (auth.uid() = solicitante_id AND estado IN ('pendiente_soporte', 'pendiente_revision'))
    WITH CHECK (auth.uid() = solicitante_id AND estado IN ('pendiente_soporte', 'pendiente_revision'));

CREATE POLICY "Auditores y Administradores pueden modificar todos los comprobantes (auditoría)"
    ON public.comprobantes_gasto FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'auditor')));
