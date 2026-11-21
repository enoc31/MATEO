-- =============================================================================
-- MATEO Ekklesia — Allow admin_iglesia & tesorero to manage tasas_bcv
-- =============================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

DROP POLICY IF EXISTS "Administradores y directores insertan tasas de su ONG" ON public.tasas_bcv;
CREATE POLICY "Administradores y directores insertan tasas de su ONG"
  ON public.tasas_bcv
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero')
  );

DROP POLICY IF EXISTS "Administradores y directores actualizan tasas de su ONG" ON public.tasas_bcv;
CREATE POLICY "Administradores y directores actualizan tasas de su ONG"
  ON public.tasas_bcv
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero')
  );

DROP POLICY IF EXISTS "Administradores y directores eliminan tasas de su ONG" ON public.tasas_bcv;
CREATE POLICY "Administradores y directores eliminan tasas de su ONG"
  ON public.tasas_bcv
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero')
  );
