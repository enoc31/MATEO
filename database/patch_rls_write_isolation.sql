-- =============================================================================
-- PATCH: patch_rls_write_isolation.sql
-- Objetivo: Corregir politicas UPDATE y ALL que solo usan filtro de rol
--           sin ong_id, permitiendo cross-tenant writes via OR-bypass.
-- Ejecutar en: Supabase SQL Editor (produccion)
-- Requiere: patch_rls_policies_isolation.sql ejecutado previamente
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECCION 1: comprobantes_gasto — UPDATE policies
-- ---------------------------------------------------------------------------

-- 1a: Auditores/Admin pueden modificar comprobantes SOLO de su ONG
DROP POLICY IF EXISTS "Auditores y Administradores pueden modificar todos los comproba" ON public.comprobantes_gasto;
DROP POLICY IF EXISTS "Auditores y Administradores pueden modificar todos los comprobantes" ON public.comprobantes_gasto;

CREATE POLICY "Auditores y Administradores pueden modificar comprobantes de su ONG"
  ON public.comprobantes_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'auditor')
    )
  );

-- 1b: Coordinadores pueden modificar sus propios comprobantes pendientes SOLO de su ONG
DROP POLICY IF EXISTS "Coordinadores pueden modificar sus comprobantes pendientes de s" ON public.comprobantes_gasto;
DROP POLICY IF EXISTS "Coordinadores pueden modificar sus comprobantes pendientes de revision" ON public.comprobantes_gasto;

CREATE POLICY "Coordinadores pueden modificar sus comprobantes pendientes"
  ON public.comprobantes_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND auth.uid() = solicitante_id
    AND estado IN ('pendiente_soporte', 'pendiente_revision')
  );

-- ---------------------------------------------------------------------------
-- SECCION 2: solicitudes_gasto — UPDATE policy
-- ---------------------------------------------------------------------------

-- Auditores/Admin/Director pueden aprobar o rechazar solicitudes SOLO de su ONG
DROP POLICY IF EXISTS "Auditores y Administradores pueden aprobar o rechazar solicitud" ON public.solicitudes_gasto;
DROP POLICY IF EXISTS "Auditores y Administradores pueden aprobar o rechazar solicitudes" ON public.solicitudes_gasto;

CREATE POLICY "Roles autorizados pueden aprobar o rechazar solicitudes de su ONG"
  ON public.solicitudes_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'auditor', 'director')
    )
  );

-- ---------------------------------------------------------------------------
-- SECCION 3: tasas_bcv — ALL policies (gestión)
-- Nota: tasas_bcv tiene la politica aislamiento_ong_tasas FOR ALL que ya
-- cubre con ong_id. Sin embargo, las otras politicas ALL sin ong_id actuan
-- como OR, anulando el aislamiento para WRITE ops.
-- ---------------------------------------------------------------------------

-- 3a: Eliminar politica duplicada permisiva
DROP POLICY IF EXISTS "Gestión de tasas para admins y directores" ON public.tasas_bcv;

-- 3b: Reemplazar la politica de solo-admin con ong_id
DROP POLICY IF EXISTS "Solo administradores pueden gestionar tasas BCV" ON public.tasas_bcv;

-- Crear una unica politica de escritura/gestion con ong_id
CREATE POLICY "Administradores y directores gestionan tasas de su ONG"
  ON public.tasas_bcv
  FOR ALL
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'director')
    )
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'director')
    )
  );

-- ---------------------------------------------------------------------------
-- VERIFICACION FINAL — Debe mostrar ong_id en TODAS las condiciones USING
-- ---------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  cmd AS operacion,
  qual AS condicion_using
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'comprobantes_gasto',
    'solicitudes_gasto',
    'tasas_bcv'
  )
ORDER BY tablename, cmd, policyname;
