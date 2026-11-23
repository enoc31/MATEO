-- RLS checks the row's ong_id but foreign keys alone do not ensure referenced
-- records belong to the same organization. Enforce that invariant for writes.
SET lock_timeout = '2s';
SET statement_timeout = '30s';
CREATE OR REPLACE FUNCTION public.validate_donacion_tenant_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.miembro_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.beneficiarios WHERE id = NEW.miembro_id AND ong_id = NEW.ong_id
      )) OR (NEW.cuenta_receptora_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.cuentas_receptoras_iglesia WHERE id = NEW.cuenta_receptora_id AND ong_id = NEW.ong_id
      )) OR (NEW.reporte_origen_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.reportes_aportes WHERE id = NEW.reporte_origen_id AND ong_id = NEW.ong_id
      )) OR (NEW.proyecto_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.proyectos WHERE id = NEW.proyecto_id AND ong_id = NEW.ong_id
      )) OR (NEW.transaccion_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.transacciones_bancarias WHERE id = NEW.transaccion_id AND ong_id = NEW.ong_id
      )) OR (NEW.created_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.usuarios_perfiles WHERE id = NEW.created_by AND ong_id = NEW.ong_id
      )) THEN
    RAISE EXCEPTION 'La referencia no pertenece a la organización' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_donacion_tenant_references ON public.donaciones;
CREATE TRIGGER validate_donacion_tenant_references
BEFORE INSERT OR UPDATE OF ong_id, miembro_id, cuenta_receptora_id, reporte_origen_id, proyecto_id, transaccion_id, created_by
ON public.donaciones FOR EACH ROW EXECUTE FUNCTION public.validate_donacion_tenant_references();

CREATE OR REPLACE FUNCTION public.validate_comprobante_tenant_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.proyectos_partidas
    WHERE proyecto_id = NEW.proyecto_id AND partida_id = NEW.partida_id AND ong_id = NEW.ong_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.proyectos WHERE id = NEW.proyecto_id AND ong_id = NEW.ong_id
  ) OR (NEW.solicitud_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.solicitudes_gasto
    WHERE id = NEW.solicitud_id AND ong_id = NEW.ong_id
      AND proyecto_id = NEW.proyecto_id AND partida_id = NEW.partida_id
  )) OR (NEW.transaccion_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.transacciones_bancarias WHERE id = NEW.transaccion_id AND ong_id = NEW.ong_id
  )) OR NOT EXISTS (
    SELECT 1 FROM public.usuarios_perfiles WHERE id = NEW.solicitante_id AND ong_id = NEW.ong_id
  ) OR (NEW.auditado_por IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.usuarios_perfiles WHERE id = NEW.auditado_por AND ong_id = NEW.ong_id
  )) THEN
    RAISE EXCEPTION 'La referencia no pertenece a la organización' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_comprobante_tenant_references ON public.comprobantes_gasto;
CREATE TRIGGER validate_comprobante_tenant_references
BEFORE INSERT OR UPDATE OF ong_id, proyecto_id, partida_id, solicitud_id, transaccion_id, solicitante_id, auditado_por
ON public.comprobantes_gasto FOR EACH ROW EXECUTE FUNCTION public.validate_comprobante_tenant_references();

RESET lock_timeout;
RESET statement_timeout;
