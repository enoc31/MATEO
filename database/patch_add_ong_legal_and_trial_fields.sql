-- =========================================================================
-- PARCHE DE MIGRACIÓN: AGREGAR CAMPOS LEGALES Y DE TRIAL A LA TABLA ONGS
-- =========================================================================

ALTER TABLE ongs ADD COLUMN IF NOT EXISTS rif_identificacion VARCHAR(50);
ALTER TABLE ongs ADD COLUMN IF NOT EXISTS pais VARCHAR(100) DEFAULT 'Venezuela';
ALTER TABLE ongs ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE ongs ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE ongs ADD COLUMN IF NOT EXISTS sitio_web VARCHAR(255);
ALTER TABLE ongs ADD COLUMN IF NOT EXISTS plan VARCHAR(30) DEFAULT 'trial';
ALTER TABLE ongs ADD COLUMN IF NOT EXISTS estado VARCHAR(30) DEFAULT 'trial';
ALTER TABLE ongs ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');

-- Recargar la caché del esquema de PostgREST en Supabase
NOTIFY pgrst, 'reload schema';
