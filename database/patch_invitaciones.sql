-- =========================================================================
-- MIGRACIÓN DE BD: TABLA DE INVITACIONES EXCLUSIVAS DE TENANT (ONG)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.invitaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ong_id UUID NOT NULL REFERENCES public.ongs(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    rol user_role NOT NULL DEFAULT 'coordinador',
    token VARCHAR(255) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aceptada', 'expirada'
    invitado_por UUID REFERENCES public.usuarios_perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Índices de rendimiento para búsquedas por token y correo
CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON public.invitaciones(token);
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON public.invitaciones(email);
CREATE INDEX IF NOT EXISTS idx_invitaciones_ong ON public.invitaciones(ong_id);

-- Habilitar RLS en la tabla invitaciones
ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS:
-- 1. Administradores de ONG y SuperAdmins pueden ver y crear invitaciones para su ONG
DROP POLICY IF EXISTS "Administradores leen invitaciones de su ONG" ON public.invitaciones;
CREATE POLICY "Administradores leen invitaciones de su ONG" ON public.invitaciones
    FOR SELECT TO authenticated
    USING (
        ong_id IN (
            SELECT up.ong_id FROM public.usuarios_perfiles up
            WHERE up.id = auth.uid() AND up.rol IN ('administrador', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Administradores crean invitaciones para su ONG" ON public.invitaciones;
CREATE POLICY "Administradores crean invitaciones para su ONG" ON public.invitaciones
    FOR INSERT TO authenticated
    WITH CHECK (
        ong_id IN (
            SELECT up.ong_id FROM public.usuarios_perfiles up
            WHERE up.id = auth.uid() AND up.rol IN ('administrador', 'super_admin')
        )
    );

-- 2. Permitir lectura anónima por token para la pantalla pública /aceptar-invitacion
DROP POLICY IF EXISTS "Lectura publica de invitacion por token" ON public.invitaciones;
CREATE POLICY "Lectura publica de invitacion por token" ON public.invitaciones
    FOR SELECT TO anon
    USING (estado = 'pendiente');

NOTIFY pgrst, 'reload schema';
