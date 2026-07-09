-- =========================================================================
-- FASE 1.1: ESTABLECER VALORES PREDETERMINADOS PARA ong_id
-- =========================================================================
-- Este script configura la base de datos para que asigne automáticamente
-- el ong_id del usuario logueado en todas las inserciones, evitando tener
-- que modificar todas las consultas y llamadas del frontend.

-- Aseguramos que la función helper exista y retorne el ong_id
CREATE OR REPLACE FUNCTION public.get_user_ong_id()
RETURNS UUID AS $$
  SELECT ong_id FROM public.usuarios_perfiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Establecer el valor predeterminado (default) en cada tabla transaccional
ALTER TABLE public.proyectos ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.categorias_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.partidas_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.presupuestos ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.transacciones_bancarias ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.comprobantes_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.donaciones ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();

-- tasas_bcv requiere un cambio de restricción única antes de aplicar el default
ALTER TABLE public.tasas_bcv DROP CONSTRAINT IF EXISTS tasas_bcv_fecha_unique;
ALTER TABLE public.tasas_bcv ADD CONSTRAINT tasas_bcv_ong_fecha_unique UNIQUE (ong_id, fecha);
ALTER TABLE public.tasas_bcv ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.jornadas ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.beneficiarios ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.solicitudes_gasto ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.documentos_adjuntos ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();
ALTER TABLE public.donantes ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();

-- Nota: Para el registro de nuevos usuarios en usuarios_perfiles, la función handle_new_user()
-- ya se encarga de asignar la ONG CNBV por defecto durante el proceso de registro (Auth Trigger).
