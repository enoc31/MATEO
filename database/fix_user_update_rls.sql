-- =========================================================================
-- CORRECCIÓN DEFINITIVA DE RLS PARA ACTUALIZACIÓN DE USUARIOS
-- =========================================================================
-- Permite que los usuarios con rol 'administrador' y 'super_admin' puedan
-- cambiar el rol, la ONG (ong_id) y el estado de aprobación de cualquier usuario
-- sin sufrir bloqueos de RLS.

-- 1. Eliminar políticas restrictivas previas de UPDATE en usuarios_perfiles
DROP POLICY IF EXISTS "upd_perfiles_aislamiento" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Permitir a administradores actualizar cualquier perfil" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "aislamiento_ong_perfiles" ON public.usuarios_perfiles;

-- 2. Política de Lectura (SELECT): Administradores y SuperAdmins ven todos los perfiles; usuarios normales ven perfiles de su ONG o el propio
CREATE POLICY "sel_usuarios_perfiles_general"
  ON public.usuarios_perfiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador')
    OR ong_id = public.get_user_ong_id()
    OR id = auth.uid()
  );

-- 3. Política de Actualización (UPDATE): Administradores y SuperAdmins pueden actualizar cualquier perfil
CREATE POLICY "upd_usuarios_perfiles_general"
  ON public.usuarios_perfiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador')
    OR id = auth.uid()
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador')
    OR id = auth.uid()
  );
