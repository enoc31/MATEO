-- =========================================================================
-- PATCH: Incorporación de Columnas y Tabla para Miembros de Ekklesia
-- Ejecutar este script en el SQL Editor de Supabase
-- =========================================================================

-- 1. Agregar columnas físicas a la tabla public.beneficiarios si no existen
ALTER TABLE public.beneficiarios 
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS telefono TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS redes_sociales TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS foto_cedula_url TEXT,
ADD COLUMN IF NOT EXISTS bautizado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grado_instruccion TEXT,
ADD COLUMN IF NOT EXISTS enfermedad TEXT,
ADD COLUMN IF NOT EXISTS fecha_membresia DATE,
ADD COLUMN IF NOT EXISTS cargo_eclesiastico TEXT DEFAULT 'MIEMBRO GENERAL',
ADD COLUMN IF NOT EXISTS areas_ministeriales TEXT[];

-- 2. Crear vista dedicada para consulta limpia del Padrón de Ekklesia
CREATE OR REPLACE VIEW public.v_miembros_ekklesia AS
SELECT 
    id,
    ong_id,
    jornada_id,
    nombre,
    apellido,
    cedula,
    sexo,
    fecha_nacimiento,
    direccion,
    telefono,
    email,
    redes_sociales,
    foto_url,
    foto_cedula_url,
    bautizado,
    grado_instruccion,
    enfermedad,
    fecha_membresia,
    cargo_eclesiastico,
    areas_ministeriales,
    created_at
FROM public.beneficiarios
WHERE 'Ekklesia' = ANY(tipo_donacion) 
   OR cargo_eclesiastico IS NOT NULL 
   OR jornada_id IN (SELECT id FROM public.jornadas WHERE nombre LIKE '%Ekklesia%');

-- 3. Crear índices para optimización de búsqueda por cédula, nombre y rol eclesiástico
CREATE INDEX IF NOT EXISTS idx_beneficiarios_cargo_eclesiastico ON public.beneficiarios(cargo_eclesiastico);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_bautizado ON public.beneficiarios(bautizado);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_email ON public.beneficiarios(email);

-- 4. Notificar recarga del schema cache en Supabase
NOTIFY pgrst, 'reload schema';
