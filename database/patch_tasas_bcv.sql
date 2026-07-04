-- ============================================================
-- PATCH: Tasas BCV + Multi-Moneda en Donaciones
-- Sistema de Auditoría CNBV
-- Ejecutar en: Supabase → SQL Editor
-- Fecha: 2026-07-04
-- ============================================================


-- ============================================================
-- PARTE 1: TABLA tasas_bcv
-- ============================================================
-- Almacena una tasa BCV oficial por día (fecha UNIQUE).
-- Poblada automáticamente por la Edge Function sync-tasa-bcv
-- vía pg_cron (Lun-Vie a las 5:05 PM hora Venezuela / 21:05 UTC).
-- El administrador puede cargar tasas históricas manualmente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasas_bcv (
    id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
    fecha       DATE          NOT NULL,
    tasa        NUMERIC(14,4) NOT NULL CHECK (tasa > 0),
    fuente      TEXT          NOT NULL DEFAULT 'bcv_api',
    --  Valores: 'bcv_api' | 'manual' | 'historico_csv'
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT  tasas_bcv_fecha_unique UNIQUE (fecha)
);

-- Índice descendente para consultas por fecha (más reciente primero)
CREATE INDEX IF NOT EXISTS idx_tasas_bcv_fecha
    ON public.tasas_bcv (fecha DESC);

-- Comentarios descriptivos
COMMENT ON TABLE  public.tasas_bcv         IS 'Tasas de cambio BCV (Bs./USD) por fecha. Una fila por día hábil.';
COMMENT ON COLUMN public.tasas_bcv.fecha   IS 'Fecha para la que aplica la tasa. El BCV la publica el día hábil anterior a las 5 PM VE.';
COMMENT ON COLUMN public.tasas_bcv.tasa    IS 'Bolívares por 1 USD según tasa oficial BCV.';
COMMENT ON COLUMN public.tasas_bcv.fuente  IS 'Origen: bcv_api (cron automático), manual (UI admin), historico_csv (importación CSV).';


-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.tasas_bcv ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer las tasas
CREATE POLICY "Lectura de tasas BCV para todos los autenticados"
    ON public.tasas_bcv FOR SELECT TO authenticated
    USING (true);

-- Solo administradores pueden insertar/editar tasas desde la UI
CREATE POLICY "Solo administradores pueden gestionar tasas BCV"
    ON public.tasas_bcv FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_perfiles
            WHERE id = auth.uid() AND rol = 'administrador'
        )
    );
-- La Edge Function usa service_role_key → bypasea RLS automáticamente.


-- ============================================================
-- PARTE 2: MIGRACIÓN tabla donaciones
-- Nuevas columnas para soporte multi-moneda (VES / USD)
-- ============================================================

-- 2.1 Moneda en que fue recibido el pago
ALTER TABLE public.donaciones
    ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN public.donaciones.moneda
    IS 'Moneda del pago recibido: USD o VES (Bolívares).';

-- 2.2 Medio de pago
ALTER TABLE public.donaciones
    ADD COLUMN IF NOT EXISTS medio_pago TEXT NOT NULL DEFAULT 'transferencia';

COMMENT ON COLUMN public.donaciones.medio_pago
    IS 'Forma de recepción del dinero: transferencia o efectivo.';

-- 2.3 Monto en la moneda original del pago
ALTER TABLE public.donaciones
    ADD COLUMN IF NOT EXISTS monto_original NUMERIC(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.donaciones.monto_original
    IS 'Monto en la moneda original: Bolívares si moneda=VES, USD si moneda=USD.';

-- 2.4 Tasa BCV usada en la conversión (null si moneda = USD)
ALTER TABLE public.donaciones
    ADD COLUMN IF NOT EXISTS tasa_bcv NUMERIC(14,4);

COMMENT ON COLUMN public.donaciones.tasa_bcv
    IS 'Tasa BCV (Bs./USD) vigente para la fecha del ingreso. NULL si moneda=USD.';

-- 2.5 Equivalente en USD (columna principal para reportes y totales)
ALTER TABLE public.donaciones
    ADD COLUMN IF NOT EXISTS monto_usd NUMERIC(15,2);

COMMENT ON COLUMN public.donaciones.monto_usd
    IS 'Valor en USD. Para moneda=USD igual a monto_original. Para VES = monto_original / tasa_bcv.';

-- 2.6 Equivalente en Bolívares (null si moneda = USD)
ALTER TABLE public.donaciones
    ADD COLUMN IF NOT EXISTS monto_ves NUMERIC(15,2);

COMMENT ON COLUMN public.donaciones.monto_ves
    IS 'Valor en Bolívares. Para moneda=VES igual a monto_original. NULL si moneda=USD.';

-- 2.7 Retrocompatibilidad: rellenar nuevos campos para registros existentes
--     (todos eran en USD antes de este patch)
UPDATE public.donaciones
    SET monto_original = monto,
        monto_usd      = monto
    WHERE monto_usd IS NULL;


-- ============================================================
-- PARTE 3: CRON JOB via pg_cron
-- ============================================================
-- Dispara la Edge Function sync-tasa-bcv automáticamente
-- Lunes a Viernes a las 21:05 UTC (= 17:05 hora Venezuela UTC-4)
--
-- La Edge Function:
--   1. Llama ve.dolarapi.com/v1/dolares/oficial
--   2. Calcula el próximo día hábil como fecha destino:
--      Lun→Mar | Mar→Mié | Mié→Jue | Jue→Vie | Vie→Lun siguiente
--   3. Inserta en tasas_bcv (ignorando si ya existe)
-- ============================================================

-- 3.1 Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3.2 Registrar el cron job
-- ⚠️  IMPORTANTE: Reemplaza los marcadores antes de ejecutar:
--     <TU_PROJECT_REF>      → ID del proyecto (ej: abcdefghijklmnop)
--                             Encuéntralo en: Settings → General → Reference ID
--     <TU_SERVICE_ROLE_KEY> → En: Settings → API → service_role secret
--
SELECT cron.schedule(
    'sync-tasa-bcv-diario',
    '5 21 * * 1-5',
    $$
        SELECT net.http_post(
            url     := 'https://<TU_PROJECT_REF>.supabase.co/functions/v1/sync-tasa-bcv',
            headers := jsonb_build_object(
                'Content-Type',  'application/json',
                'Authorization', 'Bearer <TU_SERVICE_ROLE_KEY>'
            ),
            body    := '{}'::jsonb
        );
    $$
);


-- ============================================================
-- CONSULTAS DE VERIFICACIÓN
-- Ejecuta cada bloque por separado después del patch
-- ============================================================

-- ✅ Ver estructura de tasas_bcv:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'tasas_bcv'
-- ORDER BY ordinal_position;

-- ✅ Ver nuevas columnas en donaciones:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'donaciones'
--   AND column_name IN ('moneda','medio_pago','monto_original','tasa_bcv','monto_usd','monto_ves')
-- ORDER BY ordinal_position;

-- ✅ Ver políticas RLS de tasas_bcv:
-- SELECT policyname, cmd, roles, qual
-- FROM pg_policies
-- WHERE tablename = 'tasas_bcv';

-- ✅ Confirmar que el cron job quedó registrado:
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname = 'sync-tasa-bcv-diario';
