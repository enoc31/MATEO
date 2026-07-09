-- =========================================================================
-- FASE 1: MIGRACIÓN MULTI-TENANT (AISLAMIENTO DE ONGs)
-- =========================================================================

-- 1. Crear tabla de ONGs
CREATE TABLE IF NOT EXISTS public.ongs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Insertar ONG Base (CNBV) con ID predeterminado para asegurar la referencia
INSERT INTO public.ongs (id, nombre, logo_url) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Convención Nacional Bautista de Venezuela', 'https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg')
ON CONFLICT (id) DO NOTHING;

-- 3. Limpieza de datos transaccionales de prueba (Se mantiene usuarios_perfiles)
TRUNCATE TABLE public.jornadas CASCADE;
TRUNCATE TABLE public.beneficiarios CASCADE;
TRUNCATE TABLE public.proyectos CASCADE;
TRUNCATE TABLE public.categorias_gasto CASCADE;
TRUNCATE TABLE public.transacciones_bancarias CASCADE;
TRUNCATE TABLE public.tasas_bcv CASCADE;
TRUNCATE TABLE public.documentos_adjuntos CASCADE;
TRUNCATE TABLE public.donantes CASCADE;

-- 4. Vincular usuarios existentes a la ONG Base
ALTER TABLE public.usuarios_perfiles 
ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111' REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.usuarios_perfiles ALTER COLUMN ong_id DROP DEFAULT;

-- 5. Agregar ong_id a todas las tablas transaccionales (obligatorio)
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.categorias_gasto ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.partidas_gasto ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.presupuestos ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.transacciones_bancarias ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.comprobantes_gasto ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.donaciones ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.tasas_bcv ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.jornadas ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.beneficiarios ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.solicitudes_gasto ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.documentos_adjuntos ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;
ALTER TABLE public.donantes ADD COLUMN IF NOT EXISTS ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE;

-- =========================================================================
-- 6. POLÍTICAS DE SEGURIDAD RLS (AISLAMIENTO MULTI-ONG)
-- =========================================================================

-- Función helper para obtener el ong_id del usuario logueado rápidamente
CREATE OR REPLACE FUNCTION public.get_user_ong_id()
RETURNS UUID AS $$
  SELECT ong_id FROM public.usuarios_perfiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Activar RLS en ongs
ALTER TABLE public.ongs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ongs_isolation" ON public.ongs FOR ALL USING (id = public.get_user_ong_id());

-- Recrear políticas de aislamiento absoluto
CREATE POLICY "aislamiento_ong_perfiles" ON public.usuarios_perfiles FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_proyectos" ON public.proyectos FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_categorias" ON public.categorias_gasto FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_partidas" ON public.partidas_gasto FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_presupuestos" ON public.presupuestos FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_transacciones" ON public.transacciones_bancarias FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_comprobantes" ON public.comprobantes_gasto FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_donaciones" ON public.donaciones FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_tasas" ON public.tasas_bcv FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_jornadas" ON public.jornadas FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_beneficiarios" ON public.beneficiarios FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_solicitudes" ON public.solicitudes_gasto FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_documentos" ON public.documentos_adjuntos FOR ALL USING (ong_id = public.get_user_ong_id());
CREATE POLICY "aislamiento_ong_donantes" ON public.donantes FOR ALL USING (ong_id = public.get_user_ong_id());

-- Actualizar la función handle_new_user() para que asigne usuarios nuevos a CNBV (temporal)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado, ong_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Usuario'),
    COALESCE((new.raw_user_meta_data->>'rol')::user_role, 'coordinador'::user_role),
    FALSE,
    '11111111-1111-1111-1111-111111111111'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
