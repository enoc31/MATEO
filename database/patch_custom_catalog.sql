-- =============================================================================
-- PATCH: patch_custom_catalog.sql
-- Objetivo: Permitir que cada ONG gestione su propio catálogo de categorías
--           y partidas de gasto, manteniendo acceso al catálogo base UNDG.
-- Requiere: todos los patches anteriores ejecutados.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECCION 1: Añadir ong_id a categorias_gasto
-- La tabla original no tenía ong_id (era catálogo global).
-- Ahora cada categoría pertenece a una ONG o al catálogo base.
-- ---------------------------------------------------------------------------

ALTER TABLE public.categorias_gasto
  ADD COLUMN IF NOT EXISTS ong_id UUID REFERENCES public.ongs(id) ON DELETE CASCADE;

-- Asignar las categorías existentes (catálogo base UNDG) a la ONG fundadora
UPDATE public.categorias_gasto
SET ong_id = '11111111-1111-1111-1111-111111111111'
WHERE ong_id IS NULL;

-- Hacer la columna NOT NULL ahora que todos tienen valor
ALTER TABLE public.categorias_gasto
  ALTER COLUMN ong_id SET NOT NULL;

-- Valor por defecto para nuevas inserciones
ALTER TABLE public.categorias_gasto
  ALTER COLUMN ong_id SET DEFAULT public.get_user_ong_id();

-- ---------------------------------------------------------------------------
-- SECCION 2: Corregir UNIQUE constraints en categorias_gasto
-- El constraint UNIQUE (nombre) era global — bloquea multi-tenant.
-- Lo reemplazamos por UNIQUE (nombre, ong_id).
-- ---------------------------------------------------------------------------

ALTER TABLE public.categorias_gasto DROP CONSTRAINT IF EXISTS categorias_gasto_nombre_key;
ALTER TABLE public.categorias_gasto
  ADD CONSTRAINT unique_categoria_nombre_ong UNIQUE (nombre, ong_id);

-- ---------------------------------------------------------------------------
-- SECCION 3: Corregir UNIQUE constraints en partidas_gasto
-- Constraints globales bloquean que dos ONGs creen partidas con mismo código.
-- ---------------------------------------------------------------------------

-- Eliminar constraints globales
ALTER TABLE public.partidas_gasto DROP CONSTRAINT IF EXISTS unique_categoria_partida;
ALTER TABLE public.partidas_gasto DROP CONSTRAINT IF EXISTS unique_codigo;
ALTER TABLE public.partidas_gasto DROP CONSTRAINT IF EXISTS partidas_gasto_codigo_key;

-- Recrear como multi-tenant (por ONG)
ALTER TABLE public.partidas_gasto
  ADD CONSTRAINT unique_partida_nombre_ong UNIQUE (categoria_id, nombre, ong_id);
ALTER TABLE public.partidas_gasto
  ADD CONSTRAINT unique_partida_codigo_ong UNIQUE (codigo, ong_id);

-- ---------------------------------------------------------------------------
-- SECCION 4: RLS para categorias_gasto
-- SELECT: catálogo base (ONG fundadora) + propias de la ONG
-- INSERT/UPDATE/DELETE: solo las propias
-- ---------------------------------------------------------------------------

ALTER TABLE public.categorias_gasto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de categorías a todos los autenticados" ON public.categorias_gasto;
DROP POLICY IF EXISTS "Solo administradores pueden gestionar categorías" ON public.categorias_gasto;

-- SELECT: catálogo base siempre visible + propias de la ONG
CREATE POLICY "Lectura de categorias: base y propias"
  ON public.categorias_gasto FOR SELECT TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR ong_id = '11111111-1111-1111-1111-111111111111'
  );

-- INSERT: solo admin/director, automáticamente con ong_id del usuario
CREATE POLICY "Inserción de categorias propias"
  ON public.categorias_gasto FOR INSERT TO authenticated
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'director')
    )
  );

-- UPDATE: solo las propias, solo admin/director
CREATE POLICY "Actualización de categorias propias"
  ON public.categorias_gasto FOR UPDATE TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'director')
    )
  );

-- DELETE: solo las propias, solo admin/director
-- Las del catálogo base (ong_id = 11111111...) están protegidas por el USING
CREATE POLICY "Eliminación de categorias propias"
  ON public.categorias_gasto FOR DELETE TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'director')
    )
  );

-- ---------------------------------------------------------------------------
-- SECCION 5: RLS para partidas_gasto — actualizar politica ALL de escritura
-- La partida propia solo puede ser eliminada/modificada por su ONG
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "aislamiento_ong_partidas" ON public.partidas_gasto;

CREATE POLICY "aislamiento_ong_partidas"
  ON public.partidas_gasto FOR ALL TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (
    ong_id = public.get_user_ong_id()
    AND EXISTS (
      SELECT 1 FROM public.usuarios_perfiles
      WHERE id = auth.uid()
        AND rol IN ('administrador', 'director')
    )
  );

-- ---------------------------------------------------------------------------
-- VERIFICACION
-- ---------------------------------------------------------------------------

-- Ver políticas activas en ambas tablas
SELECT tablename, policyname, cmd AS operacion, qual AS condicion_using
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('categorias_gasto', 'partidas_gasto')
ORDER BY tablename, policyname;

-- Ver columnas de categorias_gasto
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categorias_gasto'
ORDER BY ordinal_position;
