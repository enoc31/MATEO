-- =============================================================================
-- PATCH: patch_rls_policies_isolation.sql
-- Objetivo: Corregir vulnerabilidades criticas de aislamiento multi-tenant
--           identificadas por auditoria de seguridad externa.
-- Problema: Politicas RLS con rol-based USING sin filtro ong_id son combinadas
--           por PostgreSQL con OR (modo permisivo), permitiendo que un
--           administrador/auditor/director de ONG-A vea datos de ONG-B.
-- Ejecutar en: Supabase SQL Editor (produccion)
-- Requiere: patch_multitenant.sql y patch_rls_hardening.sql ejecutados antes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECCION 1: comprobantes_gasto — CRITICO
-- Vulnerabilidad: "Lectura de comprobantes para roles autorizados" usa rol
-- sin ong_id, permitiendo cross-tenant leak via OR.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lectura de comprobantes para roles autorizados" ON public.comprobantes_gasto;

CREATE POLICY "Lectura de comprobantes para roles autorizados"
  ON public.comprobantes_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND (
      auth.uid() = solicitante_id
      OR EXISTS (
        SELECT 1 FROM public.usuarios_perfiles
        WHERE id = auth.uid()
          AND rol IN ('administrador', 'auditor', 'director')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- SECCION 2: solicitudes_gasto — CRITICO
-- Vulnerabilidad: "Visualizacion de solicitudes segun rol" usa rol
-- sin ong_id, mismo problema de combinacion OR.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Visualización de solicitudes según rol" ON public.solicitudes_gasto;

CREATE POLICY "Visualización de solicitudes según rol"
  ON public.solicitudes_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND (
      auth.uid() = solicitante_id
      OR EXISTS (
        SELECT 1 FROM public.usuarios_perfiles
        WHERE id = auth.uid()
          AND rol IN ('administrador', 'auditor', 'director')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- SECCION 3: donantes — ALTO RIESGO
-- Vulnerabilidad: USING (true) — cualquier usuario autenticado ve todos
-- los donantes de todas las ONGs.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Donantes: lectura para autenticados" ON public.donantes;

CREATE POLICY "Donantes: lectura para autenticados"
  ON public.donantes
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
  );

-- ---------------------------------------------------------------------------
-- SECCION 4: partidas_gasto — BAJO RIESGO
-- IMPORTANTE: partidas_gasto contiene un catalogo base con UUIDs fijos
-- (patch_budget_partidas.sql siembra 17 partidas UNDG compartidas).
-- Esas partidas base tienen el ong_id de la ONG fundadora. Las ONGs nuevas
-- deben poder verlas. Estrategia: permitir acceso a partidas propias
-- O a las partidas del catalogo base (ong fundadora: 11111111-...).
-- Nota: Si todas las ONGs tienen su propia copia del catalogo, simplificar
-- a solo ong_id = get_user_ong_id().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir lectura de partidas a todos los autenticados" ON public.partidas_gasto;
DROP POLICY IF EXISTS "Lectura de partidas por ong" ON public.partidas_gasto;

CREATE POLICY "Lectura de partidas por ong"
  ON public.partidas_gasto
  FOR SELECT
  TO authenticated
  USING (
    -- Partidas propias de la ONG
    ong_id = public.get_user_ong_id()
    -- O partidas del catalogo base compartido (ONG fundadora)
    OR ong_id = '11111111-1111-1111-1111-111111111111'
  );

-- ---------------------------------------------------------------------------
-- SECCION 5: tasas_bcv — RIESGO MEDIO
-- Vulnerabilidad: USING (true) expone tasas de otras ONGs.
-- Estrategia similar: tasas propias + tasas de la ONG base (referencia).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lectura de tasas BCV para todos los autenticados" ON public.tasas_bcv;
DROP POLICY IF EXISTS "Lectura de tasas BCV por ong" ON public.tasas_bcv;

CREATE POLICY "Lectura de tasas BCV por ong"
  ON public.tasas_bcv
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'
  );

-- ---------------------------------------------------------------------------
-- VERIFICACION FINAL
-- ---------------------------------------------------------------------------

-- Ver todas las politicas activas en las tablas remediadas
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
    'donantes',
    'partidas_gasto',
    'tasas_bcv'
  )
ORDER BY tablename, policyname;

