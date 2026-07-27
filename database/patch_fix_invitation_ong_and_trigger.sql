-- =========================================================================
-- CORRECCIÓN DEFINITIVA: TRIGGER DE INVITACIONES, ASIGNACIÓN DE ONG Y CONFIRMACIÓN DE EMAIL
-- =========================================================================

-- 1. Actualizar la función del trigger handle_new_user() en PostgreSQL
-- Este trigger lee ong_id, rol y aprobado del metadata de la cuenta sin forzar ONGs por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_ong_id UUID;
  meta_rol public.user_role;
  meta_aprobado BOOLEAN;
BEGIN
  -- Extraer ong_id si viene en el metadata
  BEGIN
    meta_ong_id := (new.raw_user_meta_data->>'ong_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    meta_ong_id := NULL;
  END;

  -- Extraer rol si viene en el metadata
  BEGIN
    meta_rol := (new.raw_user_meta_data->>'rol')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    meta_rol := 'coordinador'::public.user_role;
  END;

  -- Extraer aprobado
  meta_aprobado := COALESCE((new.raw_user_meta_data->>'aprobado')::boolean, true);

  -- Insertar o actualizar el perfil
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
    rol = EXCLUDED.rol,
    aprobado = EXCLUDED.aprobado,
    ong_id = COALESCE(EXCLUDED.ong_id, public.usuarios_perfiles.ong_id),
    nombre_completo = EXCLUDED.nombre_completo;

  RETURN new;
END;
$$;

-- 2. Corregir a Alvaro Gutierrez (zapata@asgmultiplex.com) asignándole la ONG de su invitador (Fundacion Prueba)
UPDATE public.usuarios_perfiles up
SET 
  ong_id = inv.ong_id,
  rol = inv.rol,
  aprobado = true
FROM public.invitaciones inv
WHERE up.email = inv.email
  AND up.email = 'zapata@asgmultiplex.com';

-- 3. Confirmar automáticamente el correo electrónico en auth.users para zapata@asgmultiplex.com
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email = 'zapata@asgmultiplex.com';

-- 4. Sincronizar cualquier otro usuario cuyo ong_id en usuarios_perfiles no coincida con su metadata de auth
UPDATE public.usuarios_perfiles up
SET ong_id = (u.raw_user_meta_data->>'ong_id')::uuid
FROM auth.users u
WHERE up.id = u.id
  AND u.raw_user_meta_data->>'ong_id' IS NOT NULL
  AND (u.raw_user_meta_data->>'ong_id')::uuid != up.ong_id;

-- 5. Confirmar automáticamente correos de invitaciones aceptadas
UPDATE auth.users u
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
FROM public.invitaciones inv
WHERE u.email = inv.email
  AND inv.estado = 'aceptada';

NOTIFY pgrst, 'reload schema';
