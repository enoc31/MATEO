-- Recovered from the production migration history.
SET lock_timeout = '1s';
SET statement_timeout = '5s';

CREATE OR REPLACE FUNCTION public.get_public_tasa_bcv(
  p_ong_id UUID,
  p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasa NUMERIC;
BEGIN
  SELECT t.tasa
  INTO v_tasa
  FROM public.tasas_bcv t
  WHERE t.ong_id = p_ong_id
    AND t.fecha <= COALESCE(p_fecha, CURRENT_DATE)
    AND t.tasa > 1
    AND t.tasa <> 773.3125
  ORDER BY t.fecha DESC, t.created_at DESC
  LIMIT 1;

  IF v_tasa IS NOT NULL THEN
    RETURN v_tasa;
  END IF;

  SELECT t.tasa
  INTO v_tasa
  FROM public.tasas_bcv t
  WHERE t.fecha <= COALESCE(p_fecha, CURRENT_DATE)
    AND t.tasa > 1
    AND t.tasa <> 773.3125
  ORDER BY t.fecha DESC, t.created_at DESC
  LIMIT 1;

  RETURN v_tasa;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_tasa_bcv(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tasa_bcv(UUID, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_reporte_aporte(
  p_ong_id UUID,
  p_cuenta_receptora_id UUID DEFAULT NULL,
  p_miembro_id TEXT DEFAULT NULL,
  p_es_anonimo BOOLEAN DEFAULT false,
  p_nombre_aportante TEXT DEFAULT NULL,
  p_telefono_aportante TEXT DEFAULT NULL,
  p_cedula_aportante TEXT DEFAULT NULL,
  p_categoria_aporte TEXT DEFAULT 'diezmo',
  p_moneda TEXT DEFAULT 'VES',
  p_monto_original NUMERIC DEFAULT 0,
  p_tasa_bcv NUMERIC DEFAULT NULL,
  p_monto_usd NUMERIC DEFAULT 0,
  p_monto_ves NUMERIC DEFAULT NULL,
  p_medio_pago TEXT DEFAULT 'pago_movil',
  p_banco_emisor TEXT DEFAULT NULL,
  p_telefono_emisor TEXT DEFAULT NULL,
  p_referencia TEXT DEFAULT NULL,
  p_sin_referencia_mismo_banco BOOLEAN DEFAULT false,
  p_fecha_pago DATE DEFAULT CURRENT_DATE,
  p_actividad_o_responsable TEXT DEFAULT NULL,
  p_comprobante_url TEXT DEFAULT NULL,
  p_codigo_confirmacion TEXT DEFAULT NULL
)
RETURNS public.reportes_aportes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT;
  v_row public.reportes_aportes;
BEGIN
  IF p_ong_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.ongs WHERE id = p_ong_id) THEN
    RAISE EXCEPTION 'La iglesia u organización indicada no existe.';
  END IF;

  IF p_monto_original IS NULL OR p_monto_original <= 0 THEN
    RAISE EXCEPTION 'El monto del aporte debe ser mayor a 0.';
  END IF;

  IF p_monto_usd IS NULL OR p_monto_usd <= 0 THEN
    RAISE EXCEPTION 'El monto equivalente en USD debe ser mayor a 0.';
  END IF;

  IF p_cuenta_receptora_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.cuentas_receptoras_iglesia
    WHERE id = p_cuenta_receptora_id AND ong_id = p_ong_id
  ) THEN
    RAISE EXCEPTION 'La cuenta receptora seleccionada no pertenece a esta iglesia.';
  END IF;

  IF p_miembro_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.beneficiarios
    WHERE id = p_miembro_id AND ong_id = p_ong_id
  ) THEN
    RAISE EXCEPTION 'El miembro seleccionado no pertenece a esta iglesia.';
  END IF;

  v_codigo := COALESCE(
    NULLIF(TRIM(p_codigo_confirmacion), ''),
    'APO-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 6))
  );

  INSERT INTO public.reportes_aportes (
    ong_id,
    cuenta_receptora_id,
    miembro_id,
    es_anonimo,
    nombre_aportante,
    telefono_aportante,
    cedula_aportante,
    categoria_aporte,
    moneda,
    monto_original,
    tasa_bcv,
    monto_usd,
    monto_ves,
    medio_pago,
    banco_emisor,
    telefono_emisor,
    referencia,
    sin_referencia_mismo_banco,
    fecha_pago,
    actividad_o_responsable,
    comprobante_url,
    codigo_confirmacion,
    estado
  )
  VALUES (
    p_ong_id,
    p_cuenta_receptora_id,
    CASE WHEN COALESCE(p_es_anonimo, false) THEN NULL ELSE p_miembro_id END,
    COALESCE(p_es_anonimo, false),
    CASE WHEN COALESCE(p_es_anonimo, false) THEN NULL ELSE NULLIF(TRIM(p_nombre_aportante), '') END,
    CASE WHEN COALESCE(p_es_anonimo, false) THEN NULL ELSE NULLIF(TRIM(p_telefono_aportante), '') END,
    CASE WHEN COALESCE(p_es_anonimo, false) THEN NULL ELSE NULLIF(TRIM(p_cedula_aportante), '') END,
    p_categoria_aporte,
    p_moneda,
    p_monto_original,
    p_tasa_bcv,
    p_monto_usd,
    p_monto_ves,
    p_medio_pago,
    NULLIF(TRIM(p_banco_emisor), ''),
    NULLIF(TRIM(p_telefono_emisor), ''),
    NULLIF(TRIM(p_referencia), ''),
    COALESCE(p_sin_referencia_mismo_banco, false),
    COALESCE(p_fecha_pago, CURRENT_DATE),
    NULLIF(TRIM(p_actividad_o_responsable), ''),
    NULLIF(TRIM(p_comprobante_url), ''),
    v_codigo,
    'pendiente'
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_reporte_aporte(
  UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN, DATE, TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.registrar_reporte_aporte(
  UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN, DATE, TEXT, TEXT, TEXT
) TO anon, authenticated;

RESET lock_timeout;
RESET statement_timeout;
