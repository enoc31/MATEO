-- =========================================================================
-- SCRIPT DEFINITIVO: AISLAMIENTO DE ONGs + PERMISOS DE ROLES
-- Ejecutar en el SQL Editor de Supabase
-- =========================================================================

-- STEP 1: Forzar Row Level Security en la tabla de perfiles
ALTER TABLE public.usuarios_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_perfiles FORCE ROW LEVEL SECURITY;

-- STEP 2: Funciones helper seguras (SECURITY DEFINER evita recursión RLS)

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_perfiles
    WHERE id = auth.uid() AND rol = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios_perfiles WHERE id = auth.uid() LIMIT 1;
$$;

-- STEP 3: Limpiar TODAS las políticas existentes en usuarios_perfiles
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'usuarios_perfiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios_perfiles', pol.policyname);
  END LOOP;
END $$;

-- STEP 4: Política de LECTURA (SELECT)
-- Regla: cada usuario ve solo a los de su misma ONG
--        el super_admin ve a todos
--        cualquier usuario autenticado puede ver su propio perfil
CREATE POLICY "sel_perfiles_aislamiento"
  ON public.usuarios_perfiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR ong_id = public.get_user_ong_id()
  );

-- STEP 5: Política de INSERCIÓN (INSERT)
-- Los nuevos registros los crea el trigger, pero permitimos al propio usuario
-- insertar su perfil como fallback (necesario en el flujo de registro cliente-side)
CREATE POLICY "ins_perfiles_propia"
  ON public.usuarios_perfiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- También necesario para el trigger (se ejecuta como service_role / definer)
CREATE POLICY "ins_perfiles_trigger"
  ON public.usuarios_perfiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- STEP 6: Política de ACTUALIZACIÓN (UPDATE)
-- Super Admin: actualiza cualquier perfil sin restricciones
-- Administrador de ONG: solo puede actualizar usuarios de su misma ONG,
--   excluyendo a super_admins y otros administradores,
--   y sin poder auto-editarse
CREATE POLICY "upd_perfiles_aislamiento"
  ON public.usuarios_perfiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.get_user_role() = 'administrador'
      AND ong_id = public.get_user_ong_id()
      AND rol NOT IN ('super_admin', 'administrador')
      AND id <> auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.get_user_role() = 'administrador'
      AND ong_id = public.get_user_ong_id()
      AND rol NOT IN ('super_admin', 'administrador')
    )
  );

-- STEP 7: Trigger handle_new_user (crea perfil automáticamente al registrarse)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado, ong_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Usuario'),
    'coordinador'::public.user_role,
    false,
    COALESCE((new.raw_user_meta_data->>'ong_id')::uuid, '11111111-1111-1111-1111-111111111111')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 8: Permitir que ong_id sea NULL (para el super_admin global)
ALTER TABLE public.usuarios_perfiles ALTER COLUMN ong_id DROP NOT NULL;

-- STEP 9: Asegurar que gerardoh31@gmail.com sea super_admin sin ONG asignada
INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado, ong_id)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'nombre_completo', 'Super Administrador'),
  'super_admin'::public.user_role,
  true,
  NULL
FROM auth.users
WHERE email = 'gerardoh31@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET rol      = 'super_admin',
      aprobado = true,
      ong_id   = NULL;

-- STEP 10: Verificación final – muestra todas las políticas activas en usuarios_perfiles
SELECT policyname, cmd, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'usuarios_perfiles'
ORDER BY policyname;
