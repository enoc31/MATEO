-- 1. Crear una secuencia para la numeración automática de Requisiciones
CREATE SEQUENCE IF NOT EXISTS solicitudes_gasto_seq START 1;

-- 2. Añadir la columna 'codigo' a la tabla solicitudes_gasto
ALTER TABLE public.solicitudes_gasto ADD COLUMN IF NOT EXISTS codigo TEXT;

-- 3. Actualizar las requisiciones existentes (si hay alguna) con un código generado
UPDATE public.solicitudes_gasto 
SET codigo = 'REQ-' || LPAD(nextval('solicitudes_gasto_seq')::TEXT, 4, '0') 
WHERE codigo IS NULL;

-- 4. Establecer el valor por defecto para que las nuevas requisiciones tomen el código automáticamente
ALTER TABLE public.solicitudes_gasto ALTER COLUMN codigo SET DEFAULT 'REQ-' || LPAD(nextval('solicitudes_gasto_seq')::TEXT, 4, '0');

-- 5. Habilitar la Replicación en Tiempo Real (Supabase Realtime) para las notificaciones
DO $$
BEGIN
    -- Añadir solicitudes_gasto a realtime si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'solicitudes_gasto'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes_gasto;
    END IF;
    
    -- Añadir comprobantes_gasto a realtime si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'comprobantes_gasto'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE comprobantes_gasto;
    END IF;
END $$;
