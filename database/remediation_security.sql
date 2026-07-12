-- Parche de Remediación de Seguridad y Rendimiento para Supabase
-- Ejecutar en el Editor SQL de Supabase (https://supabase.com)

-- =========================================================================
-- 1. MITIGACIÓN DE ESCALACIÓN DE PRIVILEGIOS EN USUARIOS PERFILES
-- =========================================================================

-- Eliminar la política RLS insegura que permite inserciones libres
DROP POLICY IF EXISTS "Permitir inserción de perfiles propia" ON public.usuarios_perfiles;

-- Crear una función disparadora segura con privilegios SECURITY DEFINER para crear perfiles de usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado, ong_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Usuario'),
    'coordinador'::user_role, -- Forzado por defecto
    false,                    -- Forzado por defecto
    COALESCE((new.raw_user_meta_data->>'ong_id')::uuid, '11111111-1111-1111-1111-111111111111')
  );
  RETURN new;
END;
$$;

-- Vincular la función al trigger de auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Opcional: Política para que el propio usuario autenticado pueda ver su perfil
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.usuarios_perfiles;
CREATE POLICY "Usuarios ven su propio perfil" 
  ON public.usuarios_perfiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Política para que administradores vean todos los perfiles
DROP POLICY IF EXISTS "Administradores ven todos los perfiles" ON public.usuarios_perfiles;
CREATE POLICY "Administradores ven todos los perfiles" 
  ON public.usuarios_perfiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_perfiles 
    WHERE id = auth.uid() AND rol = 'administrador'
  ));


-- =========================================================================
-- 2. AJUSTE DE POLÍTICAS DE LECTURA (Bypass RLS para Dashboard de Director/Donante)
-- =========================================================================

-- Donaciones: Permitir lectura a administrador, auditor, director y donante
DROP POLICY IF EXISTS "Lectura de donaciones para administradores y auditores" ON public.donaciones;
CREATE POLICY "Lectura de donaciones para roles autorizados"
  ON public.donaciones FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_perfiles 
    WHERE id = auth.uid() 
    AND rol IN ('administrador', 'auditor', 'director', 'donante')
  ));

-- Gastos: Permitir lectura a solicitantes, administrador, auditor y directores
DROP POLICY IF EXISTS "Lectura de comprobantes: Coordinadores ven los suyos, Auditores/Admin ven todo" ON public.comprobantes_gasto;
CREATE POLICY "Lectura de comprobantes para roles autorizados"
  ON public.comprobantes_gasto FOR SELECT TO authenticated 
  USING (
    auth.uid() = solicitante_id OR 
    EXISTS (
      SELECT 1 FROM public.usuarios_perfiles 
      WHERE id = auth.uid() 
      AND rol IN ('administrador', 'auditor', 'director')
    )
  );


-- =========================================================================
-- 3. CREACIÓN DE ÍNDICES DE RENDIMIENTO (Prevención DoS)
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_comprobantes_gasto_proyecto ON public.comprobantes_gasto(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_gasto_partida ON public.comprobantes_gasto(partida_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_gasto_proyecto ON public.solicitudes_gasto(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_proyecto_partida ON public.presupuestos(proyecto_id, partida_id);
