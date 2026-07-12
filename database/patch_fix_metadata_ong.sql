-- 1. Corregir la función del trigger para nuevos usuarios
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
    'coordinador'::user_role, -- Forzado por defecto
    false,                    -- Forzado por defecto
    COALESCE((new.raw_user_meta_data->>'ong_id')::uuid, '11111111-1111-1111-1111-111111111111')
  );
  RETURN new;
END;
$$;

-- 2. Corregir los usuarios existentes cuyo ong_id se quedó en la predeterminada (CNBV) por error
UPDATE public.usuarios_perfiles up
SET ong_id = (u.raw_user_meta_data->>'ong_id')::uuid
FROM auth.users u
WHERE up.id = u.id 
  AND u.raw_user_meta_data->>'ong_id' IS NOT NULL
  AND up.ong_id = '11111111-1111-1111-1111-111111111111';

-- 3. Corregir los proyectos existentes que se crearon bajo la organización CNBV por defecto
UPDATE public.proyectos p
SET ong_id = up.ong_id
FROM public.usuarios_perfiles up
WHERE p.ong_id = '11111111-1111-1111-1111-111111111111'
  AND up.rol = 'administrador';
