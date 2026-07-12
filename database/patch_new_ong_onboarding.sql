-- =============================================================================
-- PATCH: patch_new_ong_onboarding.sql
-- Objetivo: Garantizar que una ONG nueva queda completamente funcional
--           e aislada al ser creada en la plataforma MATEO.
-- Ejecutar en: Supabase SQL Editor
-- Requiere: Todos los patches anteriores ejecutados
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECCION 1: Corregir usuarios_perfiles — USING (true) expone emails/nombres
-- de usuarios de otras ONGs
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir lectura de perfiles a todos los usuarios autenticados" ON public.usuarios_perfiles;

-- Cada usuario solo ve perfiles de su misma ONG (para selectores internos)
-- + puede ver su propio perfil siempre
CREATE POLICY "Lectura de perfiles dentro de la misma ONG"
  ON public.usuarios_perfiles
  FOR SELECT
  TO authenticated
  USING (
    ong_id = public.get_user_ong_id()
    OR id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- SECCION 2: Funcion de onboarding automatico para ONG nueva
-- Se ejecuta cuando se crea una ONG via trigger en la tabla ongs.
-- Siembra las tasas BCV iniciales y configura datos base.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.seed_new_ong(p_ong_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tasa_base NUMERIC(15,4);
  v_fecha_base DATE;
BEGIN
  -- 1. Intentar copiar la ultima tasa BCV de la ONG base como referencia inicial
  SELECT tasa, fecha INTO v_tasa_base, v_fecha_base
  FROM public.tasas_bcv
  WHERE ong_id = '11111111-1111-1111-1111-111111111111'
  ORDER BY fecha DESC
  LIMIT 1;

  -- 2. Si existe una tasa base, crear una copia para la nueva ONG
  IF v_tasa_base IS NOT NULL THEN
    INSERT INTO public.tasas_bcv (ong_id, tasa, fecha)
    VALUES (p_ong_id, v_tasa_base, CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'ONG % inicializada correctamente', p_ong_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- SECCION 3: Trigger automatico al crear una ONG nueva
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_ong()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.seed_new_ong(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_new_ong ON public.ongs;

CREATE TRIGGER trg_on_new_ong
  AFTER INSERT ON public.ongs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_ong();

-- ---------------------------------------------------------------------------
-- SECCION 4: categorias_gasto — Aclaracion de arquitectura
-- La tabla NO tiene ong_id (es un catalogo estandar UNDG compartido).
-- Es correcto que sea global: todas las ONGs usan las mismas categorias
-- internacionales de gasto humanitario.
-- No se requiere aislamiento aqui — es datos de referencia, no operacionales.
-- ---------------------------------------------------------------------------

-- Verificar que la politica de categorias es correcta (lectura abierta para catalogo)
-- No se modifica — es comportamiento correcto por diseno.

-- ---------------------------------------------------------------------------
-- SECCION 5: Asignar la ONG base a usuarios sin ong_id (datos huerfanos)
-- ---------------------------------------------------------------------------

-- Cualquier usuario que no tenga ong_id asignado (edge case de registro antiguo)
-- recibe la ONG base por defecto
UPDATE public.usuarios_perfiles
SET ong_id = '11111111-1111-1111-1111-111111111111'
WHERE ong_id IS NULL;

-- ---------------------------------------------------------------------------
-- VERIFICACION
-- ---------------------------------------------------------------------------

-- Ver la nueva politica de usuarios_perfiles
SELECT policyname, cmd, qual AS condicion_using
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'usuarios_perfiles'
ORDER BY policyname;

-- Ver trigger de nueva ONG
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trg_on_new_ong' AND trigger_schema = 'public';

-- Contar usuarios sin ong_id (debe ser 0)
SELECT COUNT(*) AS usuarios_sin_ong FROM public.usuarios_perfiles WHERE ong_id IS NULL;
