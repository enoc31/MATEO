-- =========================================================================
-- PARCHE DE CORRECCIÓN: TRIGGER DE USUARIOS & ROL ADMINISTRADOR DE ONG
-- =========================================================================

-- 1. Actualizar la función del trigger para respetar 'rol' y 'aprobado' pasados en raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios_perfiles (id, email, nombre_completo, rol, aprobado, ong_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Nuevo Usuario'),
    COALESCE((new.raw_user_meta_data->>'rol')::user_role, 'coordinador'::user_role),
    COALESCE((new.raw_user_meta_data->>'aprobado')::boolean, false),
    COALESCE((new.raw_user_meta_data->>'ong_id')::uuid, '11111111-1111-1111-1111-111111111111')
  )
  ON CONFLICT (id) DO UPDATE SET
    rol = EXCLUDED.rol,
    aprobado = EXCLUDED.aprobado,
    ong_id = EXCLUDED.ong_id,
    nombre_completo = EXCLUDED.nombre_completo;
  RETURN new;
END;
$$;

-- 2. Corregir usuarios cuyos roles en metadata indican 'administrador' pero se guardaron como 'coordinador'
UPDATE public.usuarios_perfiles up
SET rol = 'administrador', aprobado = true
FROM auth.users u
WHERE up.id = u.id
  AND u.raw_user_meta_data->>'rol' = 'administrador';
