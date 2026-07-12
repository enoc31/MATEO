-- =========================================================================
-- SOLUCIÓN COMPLETA: POLÍTICAS RLS SEGURAS Y CONTROL DE ROLES
-- Ejecutar este script en el SQL Editor de su consola de Supabase
-- =========================================================================

-- 1. Helper: Verificar si el usuario actual es Super Administrador
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_perfiles 
    WHERE id = auth.uid() AND rol = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Helper: Obtener el rol del usuario actual de manera segura (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT rol FROM public.usuarios_perfiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Limpiar todas las políticas previas de la tabla 'usuarios_perfiles'
DROP POLICY IF EXISTS "Lectura de perfiles dentro de la misma ONG" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Administradores ven todos los perfiles" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "aislamiento_ong_perfiles" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Permitir a administradores actualizar cualquier perfil" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Permitir a administradores actualizar perfiles de su ONG" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Permitir actualizaciones de perfiles" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Lectura de perfiles con aislamiento" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Actualizacion de perfiles con restricciones" ON public.usuarios_perfiles;

-- 4. POLÍTICA DE LECTURA (SELECT): Aislamiento por ONG y acceso global al Super Admin
CREATE POLICY "Lectura de perfiles con aislamiento" ON public.usuarios_perfiles 
    FOR SELECT TO authenticated 
    USING (
        ong_id = public.get_user_ong_id() 
        OR public.is_super_admin()
        OR id = auth.uid()
    );

-- 5. POLÍTICA DE ACTUALIZACIÓN (UPDATE): Control estricto de roles y ONGs
CREATE POLICY "Actualizacion de perfiles con restricciones" ON public.usuarios_perfiles
  FOR UPDATE
  TO authenticated
  USING (
    -- El Super Administrador puede actualizar cualquier perfil
    public.is_super_admin()
    -- O el Administrador de la misma ONG puede actualizar con restricciones
    OR (
      public.get_user_role() = 'administrador'
      AND ong_id = public.get_user_ong_id()
      -- No puede editar a un super_admin ni a otro administrador
      AND rol NOT IN ('super_admin', 'administrador')
      -- No puede editarse a sí mismo para prevenir auto-aprobación/escalación
      AND id <> auth.uid()
    )
  )
  WITH CHECK (
    -- El Super Administrador puede colocar cualquier valor
    public.is_super_admin()
    -- O el Administrador está limitado a los cambios válidos
    OR (
      public.get_user_role() = 'administrador'
      AND ong_id = public.get_user_ong_id()
      -- El nuevo rol asignado NO puede ser super_admin ni administrador
      AND rol NOT IN ('super_admin', 'administrador')
    )
  );

-- 6. Asegurar la función del trigger handle_new_user()
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
    'coordinador'::user_role,
    false,
    COALESCE((new.raw_user_meta_data->>'ong_id')::uuid, '11111111-1111-1111-1111-111111111111')
  );
  RETURN new;
END;
$$;

-- 7. Asegurar que el trigger de creación esté activo en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Permitir que ong_id sea NULL en usuarios_perfiles para super_admins
ALTER TABLE public.usuarios_perfiles ALTER COLUMN ong_id DROP NOT NULL;

-- 9. Asegurar que el perfil de gerardoh31@gmail.com exista en public.usuarios_perfiles, tenga rol super_admin y ong_id = NULL
INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado, ong_id)
SELECT id, email, COALESCE(raw_user_meta_data->>'nombre_completo', 'Super Administrador'), 'super_admin'::public.user_role, true, NULL
FROM auth.users
WHERE email = 'gerardoh31@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET rol = 'super_admin', aprobado = true, email = 'gerardoh31@gmail.com', ong_id = NULL;

