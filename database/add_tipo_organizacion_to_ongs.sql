-- =========================================================================
-- MIGRACIÓN: AGREGAR TIPO DE ORGANIZACIÓN (ONG Humanitaria vs Iglesia Ekklesia)
-- =========================================================================

-- 1. Agregar columna tipo_organizacion a la tabla public.ongs
ALTER TABLE public.ongs 
ADD COLUMN IF NOT EXISTS tipo_organizacion TEXT DEFAULT 'ong';

-- 2. Comentario explicativo
COMMENT ON COLUMN public.ongs.tipo_organizacion IS 'Tipo de inquilino: ''ong'' para ONG Humanitaria o ''ekklesia'' para Iglesia/Religiosa';

-- 3. Marcar automáticamente las iglesias o convenciones existentes como 'ekklesia'
UPDATE public.ongs 
SET tipo_organizacion = 'ekklesia' 
WHERE nombre ILIKE '%iglesia%' 
   OR nombre ILIKE '%bautista%' 
   OR nombre ILIKE '%convencion%' 
   OR nombre ILIKE '%parroquia%' 
   OR nombre ILIKE '%ministerio%';

-- 4. Asegurar que las ONGs restantes tengan el tipo 'ong'
UPDATE public.ongs 
SET tipo_organizacion = 'ong' 
WHERE tipo_organizacion IS NULL;
