-- =============================================================================
-- CORRECCIÓN CRÍTICA DEL TRIGGER handle_new_user()
-- =============================================================================
-- PROBLEMA IDENTIFICADO:
--   El trigger fue sobreescrito por patch_multitenant.sql con el ONG ID
--   '11111111-1111-1111-1111-111111111111' (Convención Nacional Bautista)
--   hardcodeado y aprobado = FALSE, ignorando la metadata del usuario.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_ong_id   UUID;
  meta_rol      public.user_role;
  meta_aprobado BOOLEAN;
BEGIN
  -- Extraer ong_id desde el metadata. Si no viene, quedará NULL.
  BEGIN
    meta_ong_id := (new.raw_user_meta_data->>'ong_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    meta_ong_id := NULL;
  END;

  -- Extraer rol desde el metadata. Default: coordinador.
  BEGIN
    meta_rol := (new.raw_user_meta_data->>'rol')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    meta_rol := 'coordinador'::public.user_role;
  END;

  -- Extraer aprobado. Default: TRUE (usuarios invitados vienen pre-aprobados).
  meta_aprobado := COALESCE((new.raw_user_meta_data->>'aprobado')::boolean, true);

  -- Insertar el perfil respetando los datos del metadata.
  INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado, ong_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Usuario'),
    COALESCE(meta_rol, 'coordinador'::public.user_role),
    meta_aprobado,
    meta_ong_id
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre_completo = EXCLUDED.nombre_completo,
    rol             = EXCLUDED.rol,
    aprobado        = EXCLUDED.aprobado,
    ong_id          = COALESCE(EXCLUDED.ong_id, public.usuarios_perfiles.ong_id);

  RETURN new;
END;
$$;

-- Verificar que el trigger esté activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- REPARAR usuario jantonio@asgmultiplex.com: asignarle la ONG correcta
-- =============================================================================
UPDATE public.usuarios_perfiles up
SET
  ong_id   = inv.ong_id,
  rol      = inv.rol,
  aprobado = true
FROM public.invitaciones inv
WHERE up.email = inv.email
  AND up.email = 'jantonio@asgmultiplex.com';

-- Confirmar correo (solo email_confirmed_at, confirmed_at es generada)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'jantonio@asgmultiplex.com';

-- =============================================================================
-- REPARAR todos los usuarios cuyo ong_id en perfil no coincide con metadata
-- =============================================================================
UPDATE public.usuarios_perfiles up
SET ong_id = (u.raw_user_meta_data->>'ong_id')::uuid
FROM auth.users u
WHERE up.id = u.id
  AND u.raw_user_meta_data->>'ong_id' IS NOT NULL
  AND (u.raw_user_meta_data->>'ong_id') != ''
  AND (u.raw_user_meta_data->>'ong_id')::uuid IS DISTINCT FROM up.ong_id
  AND up.rol != 'super_admin';

-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================
SELECT
  up.email,
  up.rol,
  up.aprobado,
  up.ong_id,
  o.nombre AS ong_nombre
FROM public.usuarios_perfiles up
LEFT JOIN public.ongs o ON o.id = up.ong_id
ORDER BY up.created_at DESC
LIMIT 20;
