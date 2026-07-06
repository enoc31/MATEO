-- patch_documentos_gcs.sql
-- Fase 1: Tabla para gestionar la subida asíncrona a Google Cloud Storage y posterior OCR.

CREATE TABLE IF NOT EXISTS public.documentos_adjuntos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES public.usuarios_perfiles(id) ON DELETE CASCADE NOT NULL,
    url_archivo_gcs TEXT NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('FACTURA', 'COMPROBANTE', 'PRESUPUESTO', 'OTRO')),
    estado_revision VARCHAR(50) DEFAULT 'PENDIENTE' NOT NULL,
    
    -- Campos extraídos por Document AI OCR (Fase 2)
    emisor_proveedor TEXT,
    fecha_emision DATE,
    moneda VARCHAR(3),
    monto_subtotal NUMERIC(15, 2),
    monto_impuestos NUMERIC(15, 2),
    monto_total NUMERIC(15, 2),
    
    -- Enlace opcional al comprobante final consolidado (si ya se validó)
    comprobante_id UUID REFERENCES public.comprobantes_gasto(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar Row Level Security para mayor seguridad
ALTER TABLE public.documentos_adjuntos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Un usuario solo puede insertar y ver sus propios documentos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'documentos_adjuntos' AND policyname = 'Usuarios pueden gestionar sus propios documentos'
    ) THEN
        CREATE POLICY "Usuarios pueden gestionar sus propios documentos"
        ON public.documentos_adjuntos
        FOR ALL USING (auth.uid() = usuario_id);
    END IF;
END $$;
