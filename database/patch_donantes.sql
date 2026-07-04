-- ============================================================
-- PATCH: Módulo de Donantes y Vinculación con Proyectos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear tabla de Donantes
CREATE TABLE IF NOT EXISTS public.donantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('nacional', 'extranjero')),
    pais TEXT,
    contacto TEXT,
    email TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.donantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donantes: lectura para autenticados"
    ON public.donantes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Donantes: escritura solo para admin y director"
    ON public.donantes FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE id = auth.uid()
            AND rol IN ('administrador', 'director')
        )
    );

-- 3. Agregar columna donante_id a proyectos (si no existe)
ALTER TABLE public.proyectos
    ADD COLUMN IF NOT EXISTS donante_id UUID REFERENCES public.donantes(id) ON DELETE SET NULL;

-- 4. Sembrar Donantes Oficiales
-- NACIONALES
INSERT INTO public.donantes (id, nombre, tipo, pais, activo)
VALUES
    ('a0000001-0000-0000-0000-000000000001', 'Fondo Lazos de Amor',            'nacional',   'Venezuela',     TRUE)
ON CONFLICT (id) DO NOTHING;

-- EXTRANJEROS
INSERT INTO public.donantes (id, nombre, tipo, pais, activo)
VALUES
    ('b0000001-0000-0000-0000-000000000001', 'Alianza Bautista Mundial',        'extranjero', 'Internacional', TRUE),
    ('b0000001-0000-0000-0000-000000000002', 'Tearfund',                        'extranjero', 'Reino Unido',   TRUE),
    ('b0000001-0000-0000-0000-000000000003', 'Junta Misionera Internacional',   'extranjero', 'Estados Unidos',TRUE),
    ('b0000001-0000-0000-0000-000000000004', 'Convención Bautista Europea',     'extranjero', 'Europa',        TRUE)
ON CONFLICT (id) DO NOTHING;
