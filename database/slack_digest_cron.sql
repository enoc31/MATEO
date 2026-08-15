-- ============================================================
-- MATEO × Slack — Configuración del Digest Diario Automático
-- ============================================================
-- Ejecuta este script en:
--   Supabase Dashboard → SQL Editor → New Query
--
-- PASOS PREVIOS:
--   1. Configura los Secrets en Supabase Dashboard:
--      Settings → Edge Functions → Secrets
--      - SLACK_BOT_TOKEN      = xoxb-...
--      - SLACK_CHANNEL_ID     = C0XXXXXXX
--
--   2. Despliega la Edge Function:
--      supabase functions deploy slack-daily-digest
--
-- LUEGO ejecuta este SQL para activar el cron:
-- ============================================================

-- Habilitar la extensión pg_cron (si no está activa)
-- Nota: En Supabase Cloud ya viene habilitada por defecto.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar la extensión pg_net para HTTP requests desde SQL
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Eliminar job anterior si existe ──────────────────────────
SELECT cron.unschedule('mateo-slack-daily-digest')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mateo-slack-daily-digest'
);

-- ── Crear el cron job ─────────────────────────────────────────
-- Frecuencia: Lunes a Viernes a las 8:00 AM hora Caracas (UTC-4 = 12:00 UTC)
-- Para cambiar la hora: ajusta los primeros dos campos (minuto hora)
-- Ejemplos:
--   '0 12 * * 1-5'  → 8 AM Caracas, L-V
--   '0 11 * * 1-5'  → 7 AM Caracas, L-V
--   '0 13 * * 1-5'  → 9 AM Caracas, L-V
--   '0 12 * * *'    → 8 AM Caracas, todos los días

SELECT cron.schedule(
  'mateo-slack-daily-digest',          -- Nombre único del job
  '0 12 * * 1-5',                      -- Cron: Lunes-Viernes 8 AM Caracas
  $$
    SELECT net.http_post(
      url        := 'https://TU_SUPABASE_REF.supabase.co/functions/v1/slack-daily-digest',
      headers    := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY'
      ),
      body       := '{}'::jsonb
    );
  $$
);

-- ── Verificar que el job quedó registrado ─────────────────────
SELECT
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  active
FROM cron.job
WHERE jobname = 'mateo-slack-daily-digest';

-- ── OPCIONAL: Ejecutar el digest AHORA mismo (para probar) ───
-- Descomenta y ejecuta para hacer un test inmediato:
/*
SELECT net.http_post(
  url        := 'https://TU_SUPABASE_REF.supabase.co/functions/v1/slack-daily-digest',
  headers    := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer TU_SERVICE_ROLE_KEY'
  ),
  body       := '{}'::jsonb
);
*/

-- ── OPCIONAL: Pausar el job sin eliminarlo ────────────────────
-- UPDATE cron.job SET active = false WHERE jobname = 'mateo-slack-daily-digest';

-- ── OPCIONAL: Reactivar el job ────────────────────────────────
-- UPDATE cron.job SET active = true WHERE jobname = 'mateo-slack-daily-digest';

-- ── OPCIONAL: Eliminar el job definitivamente ─────────────────
-- SELECT cron.unschedule('mateo-slack-daily-digest');
