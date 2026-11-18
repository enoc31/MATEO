-- =============================================================================
-- Idempotent seed data for MATEO / CNBV base organization and UNDG catalog.
-- Safe to run repeatedly via `supabase db reset`.
-- =============================================================================

INSERT INTO public.ongs (
  id,
  nombre,
  logo_url,
  pais,
  plan,
  estado,
  tipo_organizacion
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Convención Nacional Bautista de Venezuela',
  'https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg',
  'Venezuela',
  'enterprise',
  'activo',
  'ong'
)
ON CONFLICT (id) DO NOTHING;

-- Base UNDG expense categories shared across organizations
INSERT INTO public.categorias_gasto (
  id,
  nombre,
  descripcion,
  ong_id,
  es_catalogo_undg
)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    '1. Costos Directos de Intervención (Bienes y Servicios)',
    'Compra y distribución de bienes de ayuda y atención humanitaria directa.',
    '11111111-1111-1111-1111-111111111111',
    TRUE
  ),
  (
    'c2000000-0000-0000-0000-000000000002',
    '2. Costos de Transporte, Logística y Almacenamiento',
    'Fletes, almacenamiento y movilización local de suministros de ayuda.',
    '11111111-1111-1111-1111-111111111111',
    TRUE
  ),
  (
    'c3000000-0000-0000-0000-000000000003',
    '3. Costos de Personal (Recursos Humanos)',
    'Salarios, honorarios y pólizas de seguros del personal asignado.',
    '11111111-1111-1111-1111-111111111111',
    TRUE
  ),
  (
    'c4000000-0000-0000-0000-000000000004',
    '4. Gastos de Oficina y Funcionamiento (Costos Indirectos y Operativos)',
    'Costos operativos de bases de campo, seguridad y gastos indirectos (overhead).',
    '11111111-1111-1111-1111-111111111111',
    TRUE
  ),
  (
    'c5000000-0000-0000-0000-000000000005',
    '5. Visibilidad, Monitoreo y Evaluación',
    'Reportes obligatorios, rendición de cuentas, auditorías y material de visibilidad de donantes.',
    '11111111-1111-1111-1111-111111111111',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Populate base UNDG partidas idempotently via canonical helper
SELECT public.restore_default_undg_catalog();
