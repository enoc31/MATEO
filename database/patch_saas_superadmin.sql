-- =========================================================================
-- FASE: MIGRACIÓN SAAS SUPER ADMIN (POLÍTICAS DE CONTROL GLOBAL)
-- =========================================================================

-- 1. Agregar 'super_admin' al tipo enum user_role
-- Nota: ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de transacciones en PostgreSQL.
-- Si ya existe, continuará sin lanzar error.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Crear función helper con SECURITY DEFINER para evitar recursión infinita en las políticas
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_perfiles 
    WHERE id = auth.uid() AND rol = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Limpiar políticas previas de la tabla 'ongs'
DROP POLICY IF EXISTS "ongs_isolation" ON public.ongs;
DROP POLICY IF EXISTS "Permitir lectura pública de ONGs" ON public.ongs;
DROP POLICY IF EXISTS "Permitir inserción de ONGs durante registro" ON public.ongs;
DROP POLICY IF EXISTS "Permitir modificación de ONGs a administradores y super_admins" ON public.ongs;

-- 4. Crear políticas para la tabla 'ongs'
-- SELECT: Cualquier usuario o visitante puede ver la lista básica de ONGs (necesario en el registro público)
CREATE POLICY "Permitir lectura pública de ONGs" ON public.ongs 
    FOR SELECT TO public 
    USING (true);

-- INSERT: Permitir insertar nuevas ONGs (para registrarse creando una nueva organización)
CREATE POLICY "Permitir inserción de ONGs durante registro" ON public.ongs 
    FOR INSERT TO public 
    WITH CHECK (true);

-- UPDATE/DELETE: El Administrador de la propia organización o un Super Administrador del SaaS pueden editarla
CREATE POLICY "Permitir modificación de ONGs a administradores y super_admins" ON public.ongs 
    FOR ALL TO authenticated 
    USING (
        id = public.get_user_ong_id() 
        OR public.is_super_admin()
    );

-- 5. Limpiar políticas previas de la tabla 'usuarios_perfiles'
DROP POLICY IF EXISTS "aislamiento_ong_perfiles" ON public.usuarios_perfiles;
DROP POLICY IF EXISTS "Permitir inserción de perfiles propia" ON public.usuarios_perfiles;

-- 6. Crear políticas para la tabla 'usuarios_perfiles'
-- SELECT/UPDATE/DELETE: Cada usuario opera bajo su propia ONG, pero el Super Administrador del SaaS tiene control total de todos
CREATE POLICY "aislamiento_ong_perfiles" ON public.usuarios_perfiles 
    FOR ALL TO authenticated 
    USING (
        ong_id = public.get_user_ong_id() 
        OR public.is_super_admin()
    );

-- INSERT: Permitir la autoinserción de perfiles de usuario durante la creación de cuenta
CREATE POLICY "Permitir inserción de perfiles propia" ON public.usuarios_perfiles 
    FOR INSERT TO public 
    WITH CHECK (true);
