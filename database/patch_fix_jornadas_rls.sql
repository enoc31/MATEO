-- =============================================================================
-- PATCH: patch_fix_jornadas_rls.sql
-- CRÍTICO: Habilitar RLS en tablas jornadas y beneficiarios.
-- Sin este patch, todas las políticas de aislamiento multi-tenant son IGNORADAS
-- por PostgreSQL y cualquier usuario autenticado puede ver datos de cualquier ONG.
-- 
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PASO 1: Habilitar y FORZAR Row Level Security
-- FORCE garantiza que incluso el propietario de la tabla quede sujeto a las políticas.
-- ---------------------------------------------------------------------------
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas FORCE ROW LEVEL SECURITY;

ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarios FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PASO 2: Limpiar TODAS las políticas existentes sobre estas tablas
-- para evitar conflictos por acumulación de políticas con OR permisivo.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'jornadas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.jornadas', pol.policyname);
    RAISE NOTICE 'Dropped policy: % on jornadas', pol.policyname;
  END LOOP;

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'beneficiarios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.beneficiarios', pol.policyname);
    RAISE NOTICE 'Dropped policy: % on beneficiarios', pol.policyname;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- PASO 3: Recrear políticas de aislamiento multitenant para USUARIOS AUTENTICADOS
-- Un usuario autenticado SOLO ve los registros de su propia ONG.
-- ---------------------------------------------------------------------------

-- Jornadas: usuarios autenticados solo ven su propia ONG
CREATE POLICY "aislamiento_ong_jornadas"
  ON public.jornadas
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- Beneficiarios: usuarios autenticados solo ven su propia ONG
CREATE POLICY "aislamiento_ong_beneficiarios"
  ON public.beneficiarios
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- ---------------------------------------------------------------------------
-- PASO 4: Políticas para usuarios ANÓNIMOS (formulario público de captura)
-- Solo el rol 'anon' puede leer jornadas activas e insertar beneficiarios.
-- Esto NO afecta a los usuarios autenticados, que quedan sujetos al paso 3.
-- ---------------------------------------------------------------------------

-- Anónimos: solo pueden leer jornadas activas (para cargar el formulario)
CREATE POLICY "jornadas_anon_read_active"
  ON public.jornadas
  FOR SELECT
  TO anon
  USING (activa = true);

-- Anónimos: solo pueden insertar beneficiarios (registro de campo)
CREATE POLICY "beneficiarios_anon_insert"
  ON public.beneficiarios
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- PASO 5: Verificación — debe mostrar 2 políticas por tabla
-- ---------------------------------------------------------------------------
SELECT
  tablename,
  policyname,
  roles,
  cmd AS operacion,
  qual AS condicion_using
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('jornadas', 'beneficiarios')
ORDER BY tablename, policyname;
