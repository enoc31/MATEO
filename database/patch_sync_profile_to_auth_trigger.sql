-- =========================================================================
-- PATCH: SINCRONIZACIÓN AUTOMÁTICA DE PERFIL A AUTH.USERS METADATA
-- =========================================================================
-- Garantiza que cualquier cambio realizado en public.usuarios_perfiles (ong_id, rol, aprobado)
-- se refleje inmediatamente en auth.users.raw_user_meta_data para mantener sincronización total.

CREATE OR REPLACE FUNCTION public.sync_user_profile_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) 
      || jsonb_build_object(
           'ong_id', NEW.ong_id,
           'rol', NEW.rol,
           'aprobado', NEW.aprobado,
           'nombre_completo', NEW.nombre_completo
         )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_user_profile_to_auth_metadata ON public.usuarios_perfiles;

CREATE TRIGGER tr_sync_user_profile_to_auth_metadata
  AFTER UPDATE ON public.usuarios_perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_to_auth_metadata();
