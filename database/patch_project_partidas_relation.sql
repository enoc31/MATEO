-- =============================================================================
-- PATCH: patch_project_partidas_relation.sql
-- Objetivo: Crear la tabla asociativa proyectos_partidas y sus restricciones
--           de integridad física para egresos y requisiciones.
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

-- 1. Crear tabla asociativa
CREATE TABLE IF NOT EXISTS public.proyectos_partidas (
    proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE CASCADE,
    partida_id UUID REFERENCES public.partidas_gasto(id) ON DELETE CASCADE,
    ong_id UUID NOT NULL DEFAULT public.get_user_ong_id() REFERENCES public.ongs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (proyecto_id, partida_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.proyectos_partidas ENABLE ROW LEVEL SECURITY;

-- 3. Crear política RLS (aislamiento por ong_id)
DROP POLICY IF EXISTS "Aislamiento de proyectos_partidas por ong" ON public.proyectos_partidas;
CREATE POLICY "Aislamiento de proyectos_partidas por ong"
  ON public.proyectos_partidas
  FOR ALL
  TO authenticated
  USING (ong_id = public.get_user_ong_id())
  WITH CHECK (ong_id = public.get_user_ong_id());

-- 4. Asignar el trigger automatico de ong_id
DROP TRIGGER IF EXISTS trg_set_ong_id ON public.proyectos_partidas;
CREATE TRIGGER trg_set_ong_id
  BEFORE INSERT ON public.proyectos_partidas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ong_id_from_user();

-- 5. Semillado inicial: Copiar duplas existentes en presupuestos a la nueva tabla
INSERT INTO public.proyectos_partidas (proyecto_id, partida_id, ong_id)
SELECT DISTINCT pr.proyecto_id, pr.partida_id, p.ong_id
FROM public.presupuestos pr
JOIN public.proyectos p ON pr.proyecto_id = p.id
ON CONFLICT (proyecto_id, partida_id) DO NOTHING;

-- 6. Trigger de Integridad para comprobar_gasto y solicitudes_gasto
-- Evita insertar transacciones si la partida no está asociada al proyecto.
CREATE OR REPLACE FUNCTION public.check_project_partida_relation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si el proyecto es simulación o local, omitir control en trigger si aplica
  -- Validamos contra la tabla proyectos_partidas
  IF NOT EXISTS (
    SELECT 1 FROM public.proyectos_partidas
    WHERE proyecto_id = NEW.proyecto_id AND partida_id = NEW.partida_id
  ) THEN
    RAISE EXCEPTION 'La partida contable seleccionada (ID: %) no está asociada al proyecto seleccionado (ID: %).', NEW.partida_id, NEW.proyecto_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_comprobante_partida ON public.comprobantes_gasto;
CREATE TRIGGER trg_check_comprobante_partida
  BEFORE INSERT OR UPDATE ON public.comprobantes_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.check_project_partida_relation();

DROP TRIGGER IF EXISTS trg_check_solicitud_partida ON public.solicitudes_gasto;
CREATE TRIGGER trg_check_solicitud_partida
  BEFORE INSERT OR UPDATE ON public.solicitudes_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.check_project_partida_relation();

-- ---------------------------------------------------------------------------
-- VERIFICACION
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS relaciones_semilladas FROM public.proyectos_partidas;
