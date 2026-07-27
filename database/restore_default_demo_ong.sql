-- =========================================================================
-- RESTAURACIÓN DE LA ONG Y PROYECTO DEMO POR DEFECTO
-- =========================================================================

-- 1. Insertar ONG Demo si no existe
INSERT INTO public.ongs (id, nombre, rif, direccion, telefono, email_contacto, plan_type)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Convención Nacional Bautista de Venezuela',
  'J-00000000-0',
  'Caracas, Venezuela',
  '+58 212-0000000',
  'contacto@cnbv.org',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Proyecto Demo si no existe
INSERT INTO public.proyectos (id, nombre, descripcion, activo, ong_id)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Ayuda Apure 2026',
  'Proyecto de asistencia humanitaria y apoyo médico en el estado Apure',
  true,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
