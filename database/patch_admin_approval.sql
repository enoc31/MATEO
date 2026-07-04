-- SQL Patch: Permitir a administradores aprobar y gestionar perfiles de usuario
-- Añade la política RLS que permite a usuarios con rol 'administrador' actualizar registros en public.usuarios_perfiles.

DROP POLICY IF EXISTS "Permitir a administradores actualizar cualquier perfil" ON public.usuarios_perfiles;

CREATE POLICY "Permitir a administradores actualizar cualquier perfil" 
    ON public.usuarios_perfiles FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.usuarios_perfiles WHERE id = auth.uid() AND rol = 'administrador'));
