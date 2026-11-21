-- =============================================================================
-- MATEO Ekklesia — Roles de Iglesia, Cuentas Receptoras y Reportes de Aportes
-- Safe & Idempotent migration compatible with Postgres 17 & Squawk
-- =============================================================================

SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- -----------------------------------------------------------------------------
-- 1. EXTEND public.user_role ENUM WITH EKKLESIA CHURCH ROLES
-- -----------------------------------------------------------------------------
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin_iglesia' AFTER 'super_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'tesorero' AFTER 'admin_iglesia';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pastor' AFTER 'tesorero';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'lider_ministerio' AFTER 'pastor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'auditor_iglesia' AFTER 'lider_ministerio';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'secretario' AFTER 'auditor_iglesia';

-- -----------------------------------------------------------------------------
-- 2. NEW TABLES: cuentas_receptoras_iglesia & reportes_aportes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cuentas_receptoras_iglesia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('transferencia', 'pago_movil')),
  banco TEXT NOT NULL,
  numero_cuenta TEXT,
  telefono TEXT,
  rif_cedula TEXT NOT NULL,
  titular TEXT NOT NULL,
  tipo_fondo TEXT NOT NULL DEFAULT 'General',
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.reportes_aportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_confirmacion TEXT NOT NULL,
  ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
  cuenta_receptora_id UUID REFERENCES public.cuentas_receptoras_iglesia(id) ON DELETE SET NULL,
  miembro_id TEXT REFERENCES public.beneficiarios(id) ON DELETE SET NULL,
  es_anonimo BOOLEAN NOT NULL DEFAULT FALSE,
  nombre_aportante TEXT,
  telefono_aportante TEXT,
  cedula_aportante TEXT,
  categoria_aporte TEXT NOT NULL CHECK (
    categoria_aporte IN ('diezmo', 'ofrenda', 'primicia', 'misiones', 'pro_templo', 'otro')
  ),
  moneda TEXT NOT NULL CHECK (moneda IN ('USD', 'VES')),
  monto_original NUMERIC(15, 2) NOT NULL CHECK (monto_original > 0),
  tasa_bcv NUMERIC(14, 4),
  monto_usd NUMERIC(15, 2) NOT NULL CHECK (monto_usd > 0),
  monto_ves NUMERIC(15, 2),
  medio_pago TEXT NOT NULL CHECK (medio_pago IN ('transferencia', 'pago_movil', 'efectivo')),
  referencia TEXT,
  sin_referencia_mismo_banco BOOLEAN NOT NULL DEFAULT FALSE,
  banco_emisor TEXT,
  telefono_emisor TEXT,
  fecha_pago DATE NOT NULL,
  actividad_o_responsable TEXT,
  comprobante_url TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo TEXT,
  verificado_por UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
  verificado_at TIMESTAMPTZ,
  donacion_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- -----------------------------------------------------------------------------
-- 3. EXTEND public.donaciones FOR EKKLESIA CONTRIBUTIONS
-- -----------------------------------------------------------------------------
ALTER TABLE public.donaciones
  ADD COLUMN IF NOT EXISTS categoria_aporte TEXT,
  ADD COLUMN IF NOT EXISTS referencia TEXT,
  ADD COLUMN IF NOT EXISTS banco_emisor TEXT,
  ADD COLUMN IF NOT EXISTS telefono_emisor TEXT,
  ADD COLUMN IF NOT EXISTS comprobante_url TEXT,
  ADD COLUMN IF NOT EXISTS miembro_id TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_receptora_id UUID,
  ADD COLUMN IF NOT EXISTS reporte_origen_id UUID,
  ADD COLUMN IF NOT EXISTS actividad_o_responsable TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donaciones_miembro_id_fkey') THEN
    ALTER TABLE public.donaciones
      ADD CONSTRAINT donaciones_miembro_id_fkey
      FOREIGN KEY (miembro_id) REFERENCES public.beneficiarios(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donaciones_cuenta_receptora_id_fkey') THEN
    ALTER TABLE public.donaciones
      ADD CONSTRAINT donaciones_cuenta_receptora_id_fkey
      FOREIGN KEY (cuenta_receptora_id) REFERENCES public.cuentas_receptoras_iglesia(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donaciones_reporte_origen_id_fkey') THEN
    ALTER TABLE public.donaciones
      ADD CONSTRAINT donaciones_reporte_origen_id_fkey
      FOREIGN KEY (reporte_origen_id) REFERENCES public.reportes_aportes(id) ON DELETE SET NULL NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.donaciones VALIDATE CONSTRAINT donaciones_miembro_id_fkey;
ALTER TABLE public.donaciones VALIDATE CONSTRAINT donaciones_cuenta_receptora_id_fkey;
ALTER TABLE public.donaciones VALIDATE CONSTRAINT donaciones_reporte_origen_id_fkey;

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS FOR AUTOMATIC ong_id ASSIGNMENT
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_set_ong_id ON public.cuentas_receptoras_iglesia;
CREATE TRIGGER trg_set_ong_id
  BEFORE INSERT ON public.cuentas_receptoras_iglesia
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ong_id_from_user();

DROP TRIGGER IF EXISTS trg_set_ong_id ON public.reportes_aportes;
CREATE TRIGGER trg_set_ong_id
  BEFORE INSERT ON public.reportes_aportes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ong_id_from_user();

-- -----------------------------------------------------------------------------
-- 5. UPDATE REQUISITION VALIDATOR TRIGGER TO SUPPORT EKKLESIA ROLES
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_requisition_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.validador_1_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.usuarios_perfiles up
      WHERE up.id = NEW.validador_1_id
        AND up.rol::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero', 'pastor')
    ) THEN
      RAISE EXCEPTION 'El primer validador debe tener rol Administrador, Director, Tesorero o Pastor.';
    END IF;

    IF NEW.validador_1_id = NEW.solicitante_id THEN
      RAISE EXCEPTION 'El solicitante no puede aprobar su propia solicitud.';
    END IF;
  END IF;

  IF NEW.validador_2_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.usuarios_perfiles up
      WHERE up.id = NEW.validador_2_id
        AND up.rol::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero', 'pastor')
    ) THEN
      RAISE EXCEPTION 'El segundo validador debe tener rol Administrador, Director, Tesorero o Pastor.';
    END IF;

    IF NEW.validador_2_id = NEW.solicitante_id THEN
      RAISE EXCEPTION 'El solicitante no puede aprobar su propia solicitud.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'rechazada'::public.requisition_status
       AND NEW.estado <> 'rechazada'::public.requisition_status THEN
      RAISE EXCEPTION 'No se puede modificar el estado de una solicitud ya rechazada.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. SECURITY DEFINER RPCS (PUBLIC MEMBER LOOKUP & ATOMIC VERIFICATION)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buscar_miembro_para_aporte(p_ong_id UUID, p_cedula TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_cedula TEXT;
  v_member RECORD;
  v_first_name TEXT;
  v_last_name TEXT;
  v_masked TEXT;
BEGIN
  v_clean_cedula := REGEXP_REPLACE(COALESCE(p_cedula, ''), '[^0-9A-Za-z]', '', 'g');

  IF LENGTH(v_clean_cedula) < 4 THEN
    RETURN jsonb_build_object('encontrado', FALSE);
  END IF;

  SELECT b.id, b.nombre, b.apellido
  INTO v_member
  FROM public.beneficiarios b
  WHERE b.ong_id = p_ong_id
    AND REGEXP_REPLACE(COALESCE(b.cedula, ''), '[^0-9A-Za-z]', '', 'g') = v_clean_cedula
  ORDER BY b.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('encontrado', FALSE);
  END IF;

  v_first_name := COALESCE(NULLIF(BTRIM(v_member.nombre), ''), 'M');
  v_last_name := COALESCE(NULLIF(BTRIM(v_member.apellido), ''), 'I');

  v_masked := UPPER(SUBSTRING(v_first_name FROM 1 FOR 1))
    || REPEAT('*', GREATEST(LENGTH(v_first_name) - 1, 2))
    || ' '
    || UPPER(SUBSTRING(v_last_name FROM 1 FOR 1))
    || REPEAT('*', GREATEST(LENGTH(v_last_name) - 1, 2));

  RETURN jsonb_build_object(
    'encontrado', TRUE,
    'miembro_id', v_member.id,
    'nombre_enmascarado', v_masked
  );
END;
$$;

REVOKE ALL ON FUNCTION public.buscar_miembro_para_aporte(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_miembro_para_aporte(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.aprobar_reporte_aporte(
  p_reporte_id UUID,
  p_tasa_bcv NUMERIC DEFAULT NULL,
  p_transaccion_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_ong UUID;
  v_user_role TEXT;
  v_reporte public.reportes_aportes%ROWTYPE;
  v_final_tasa NUMERIC;
  v_final_usd NUMERIC;
  v_final_ves NUMERIC;
  v_donante_label TEXT;
  v_new_donacion_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_ong := public.get_user_ong_id();
  v_user_role := public.get_user_role()::text;

  IF v_user_id IS NULL OR v_user_role NOT IN ('administrador', 'admin_iglesia', 'tesorero', 'director', 'super_admin') THEN
    RAISE EXCEPTION 'No autorizado para aprobar reportes de aportes.';
  END IF;

  SELECT * INTO v_reporte
  FROM public.reportes_aportes
  WHERE id = p_reporte_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reporte de aporte no encontrado.';
  END IF;

  IF v_user_role <> 'super_admin' AND v_reporte.ong_id <> v_user_ong THEN
    RAISE EXCEPTION 'No autorizado para modificar reportes de otra organización.';
  END IF;

  IF v_reporte.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Este reporte ya fue procesado anteriormente.';
  END IF;

  v_final_tasa := COALESCE(p_tasa_bcv, v_reporte.tasa_bcv);
  IF v_reporte.moneda = 'VES' AND v_final_tasa IS NOT NULL AND v_final_tasa > 0 THEN
    v_final_ves := v_reporte.monto_original;
    v_final_usd := ROUND((v_reporte.monto_original / v_final_tasa)::NUMERIC, 2);
  ELSE
    v_final_usd := v_reporte.monto_usd;
    v_final_ves := v_reporte.monto_ves;
  END IF;

  IF v_reporte.es_anonimo THEN
    v_donante_label := 'Aporte Anónimo / Visitante';
  ELSIF v_reporte.miembro_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(BTRIM(CONCAT(nombre, ' ', apellido)), ''), v_reporte.nombre_aportante, 'Miembro de Iglesia')
    INTO v_donante_label
    FROM public.beneficiarios
    WHERE id = v_reporte.miembro_id;
  ELSE
    v_donante_label := COALESCE(NULLIF(BTRIM(v_reporte.nombre_aportante), ''), 'Visitante');
  END IF;

  INSERT INTO public.donaciones (
    ong_id,
    transaccion_id,
    donante,
    monto,
    descripcion,
    fecha,
    moneda,
    medio_pago,
    monto_original,
    tasa_bcv,
    monto_usd,
    monto_ves,
    created_by,
    categoria_aporte,
    referencia,
    banco_emisor,
    telefono_emisor,
    comprobante_url,
    miembro_id,
    cuenta_receptora_id,
    reporte_origen_id,
    actividad_o_responsable
  ) VALUES (
    v_reporte.ong_id,
    p_transaccion_id,
    v_donante_label,
    v_final_usd,
    CONCAT(
      UPPER(v_reporte.categoria_aporte),
      ' (', v_reporte.codigo_confirmacion, ')',
      CASE WHEN v_reporte.actividad_o_responsable IS NOT NULL THEN ' — ' || v_reporte.actividad_o_responsable ELSE '' END
    ),
    v_reporte.fecha_pago,
    v_reporte.moneda,
    v_reporte.medio_pago,
    v_reporte.monto_original,
    v_final_tasa,
    v_final_usd,
    v_final_ves,
    v_user_id,
    v_reporte.categoria_aporte,
    v_reporte.referencia,
    v_reporte.banco_emisor,
    v_reporte.telefono_emisor,
    v_reporte.comprobante_url,
    v_reporte.miembro_id,
    v_reporte.cuenta_receptora_id,
    v_reporte.id,
    v_reporte.actividad_o_responsable
  )
  RETURNING id INTO v_new_donacion_id;

  IF p_transaccion_id IS NOT NULL THEN
    UPDATE public.transacciones_bancarias
    SET estado = 'conciliado'::public.transaction_status
    WHERE id = p_transaccion_id
      AND ong_id = v_reporte.ong_id;
  END IF;

  UPDATE public.reportes_aportes
  SET estado = 'aprobado',
      tasa_bcv = v_final_tasa,
      monto_usd = v_final_usd,
      monto_ves = v_final_ves,
      verificado_por = v_user_id,
      verificado_at = TIMEZONE('utc'::text, NOW()),
      donacion_id = v_new_donacion_id
  WHERE id = p_reporte_id;

  RETURN v_new_donacion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.aprobar_reporte_aporte(UUID, NUMERIC, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aprobar_reporte_aporte(UUID, NUMERIC, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.rechazar_reporte_aporte(p_reporte_id UUID, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_ong UUID;
  v_user_role TEXT;
  v_reporte public.reportes_aportes%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  v_user_ong := public.get_user_ong_id();
  v_user_role := public.get_user_role()::text;

  IF v_user_id IS NULL OR v_user_role NOT IN ('administrador', 'admin_iglesia', 'tesorero', 'director', 'super_admin') THEN
    RAISE EXCEPTION 'No autorizado para rechazar reportes de aportes.';
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_motivo, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Debe indicar un motivo de rechazo.';
  END IF;

  SELECT * INTO v_reporte
  FROM public.reportes_aportes
  WHERE id = p_reporte_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reporte de aporte no encontrado.';
  END IF;

  IF v_user_role <> 'super_admin' AND v_reporte.ong_id <> v_user_ong THEN
    RAISE EXCEPTION 'No autorizado para modificar reportes de otra organización.';
  END IF;

  IF v_reporte.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Este reporte ya fue procesado anteriormente.';
  END IF;

  UPDATE public.reportes_aportes
  SET estado = 'rechazado',
      motivo_rechazo = BTRIM(p_motivo),
      verificado_por = v_user_id,
      verificado_at = TIMEZONE('utc'::text, NOW())
  WHERE id = p_reporte_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rechazar_reporte_aporte(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rechazar_reporte_aporte(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (NEW TABLES & EKKLESIA ROLE UPDATES)
-- -----------------------------------------------------------------------------
ALTER TABLE public.cuentas_receptoras_iglesia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_aportes ENABLE ROW LEVEL SECURITY;

-- cuentas_receptoras_iglesia policies
DROP POLICY IF EXISTS "cuentas_receptoras_public_read" ON public.cuentas_receptoras_iglesia;
CREATE POLICY "cuentas_receptoras_public_read"
  ON public.cuentas_receptoras_iglesia
  FOR SELECT
  TO anon, authenticated
  USING (
    activa = TRUE
    OR public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'pastor', 'auditor_iglesia')
    )
  );

DROP POLICY IF EXISTS "cuentas_receptoras_manage" ON public.cuentas_receptoras_iglesia;
CREATE POLICY "cuentas_receptoras_manage"
  ON public.cuentas_receptoras_iglesia
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero')
    )
  );

-- reportes_aportes policies
DROP POLICY IF EXISTS "reportes_aportes_public_insert" ON public.reportes_aportes;
CREATE POLICY "reportes_aportes_public_insert"
  ON public.reportes_aportes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    estado = 'pendiente'
    AND ong_id IS NOT NULL
  );

DROP POLICY IF EXISTS "reportes_aportes_finance_read" ON public.reportes_aportes;
CREATE POLICY "reportes_aportes_finance_read"
  ON public.reportes_aportes
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'pastor', 'auditor_iglesia', 'director', 'auditor')
    )
  );

DROP POLICY IF EXISTS "reportes_aportes_finance_update" ON public.reportes_aportes;
CREATE POLICY "reportes_aportes_finance_update"
  ON public.reportes_aportes
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'director')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia', 'tesorero', 'director')
    )
  );

-- Update existing core RLS policies to include Ekklesia roles cleanly
DROP POLICY IF EXISTS "ongs_admin_update" ON public.ongs;
CREATE POLICY "ongs_admin_update"
  ON public.ongs
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
    )
  );

DROP POLICY IF EXISTS "upd_perfiles_aislamiento" ON public.usuarios_perfiles;
CREATE POLICY "upd_perfiles_aislamiento"
  ON public.usuarios_perfiles
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
    )
    OR auth.uid() = id
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      ong_id = public.get_user_ong_id()
      AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
    )
    OR (
      auth.uid() = id
      AND rol::text = public.get_user_role()::text
    )
  );

DROP POLICY IF EXISTS "Lectura de donaciones por ong y rol" ON public.donaciones;
CREATE POLICY "Lectura de donaciones por ong y rol"
  ON public.donaciones
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN (
      'administrador', 'auditor', 'director', 'coordinador', 'donante', 'super_admin',
      'admin_iglesia', 'tesorero', 'pastor', 'auditor_iglesia'
    )
  );

DROP POLICY IF EXISTS "Insercion de donaciones por ong" ON public.donaciones;
CREATE POLICY "Insercion de donaciones por ong"
  ON public.donaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'auditor', 'director', 'admin_iglesia', 'tesorero')
  );

DROP POLICY IF EXISTS "Actualizacion de donaciones por ong" ON public.donaciones;
CREATE POLICY "Actualizacion de donaciones por ong"
  ON public.donaciones
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'auditor', 'director', 'admin_iglesia', 'tesorero')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'auditor', 'director', 'admin_iglesia', 'tesorero')
  );

DROP POLICY IF EXISTS "Visualización de solicitudes según rol" ON public.solicitudes_gasto;
CREATE POLICY "Visualización de solicitudes según rol"
  ON public.solicitudes_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND (
      auth.uid() = solicitante_id
      OR public.get_user_role()::text IN ('administrador', 'auditor', 'director', 'super_admin', 'admin_iglesia', 'tesorero', 'pastor', 'auditor_iglesia')
    )
  );

DROP POLICY IF EXISTS "Coordinadores pueden crear solicitudes" ON public.solicitudes_gasto;
CREATE POLICY "Coordinadores pueden crear solicitudes"
  ON public.solicitudes_gasto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND auth.uid() = solicitante_id
    AND public.get_user_role()::text IN ('coordinador', 'administrador', 'director', 'lider_ministerio', 'admin_iglesia', 'tesorero', 'pastor')
  );

DROP POLICY IF EXISTS "Roles autorizados aprueban o rechazan solicitudes ONG" ON public.solicitudes_gasto;
CREATE POLICY "Roles autorizados aprueban o rechazan solicitudes ONG"
  ON public.solicitudes_gasto
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero', 'pastor')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'director', 'admin_iglesia', 'tesorero', 'pastor')
  );

DROP POLICY IF EXISTS "Lectura de comprobantes para roles autorizados" ON public.comprobantes_gasto;
CREATE POLICY "Lectura de comprobantes para roles autorizados"
  ON public.comprobantes_gasto
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND (
      auth.uid() = solicitante_id
      OR public.get_user_role()::text IN ('administrador', 'auditor', 'director', 'super_admin', 'admin_iglesia', 'tesorero', 'pastor', 'auditor_iglesia')
    )
  );

DROP POLICY IF EXISTS "Coordinadores pueden insertar comprobantes" ON public.comprobantes_gasto;
CREATE POLICY "Coordinadores pueden insertar comprobantes"
  ON public.comprobantes_gasto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND auth.uid() = solicitante_id
    AND public.get_user_role()::text IN ('coordinador', 'administrador', 'director', 'lider_ministerio', 'admin_iglesia', 'tesorero', 'pastor')
  );

DROP POLICY IF EXISTS "Administradores leen invitaciones de su ONG" ON public.invitaciones;
CREATE POLICY "Administradores leen invitaciones de su ONG"
  ON public.invitaciones
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
  );

DROP POLICY IF EXISTS "Administradores crean invitaciones para su ONG" ON public.invitaciones;
CREATE POLICY "Administradores crean invitaciones para su ONG"
  ON public.invitaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
  );

DROP POLICY IF EXISTS "Administradores actualizan invitaciones de su ONG" ON public.invitaciones;
CREATE POLICY "Administradores actualizan invitaciones de su ONG"
  ON public.invitaciones
  FOR UPDATE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
  )
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
  );

DROP POLICY IF EXISTS "Administradores eliminan invitaciones de su ONG" ON public.invitaciones;
CREATE POLICY "Administradores eliminan invitaciones de su ONG"
  ON public.invitaciones
  FOR DELETE
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND public.get_user_role()::text IN ('administrador', 'admin_iglesia')
  );
