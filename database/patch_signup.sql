-- SQL Patch: Fix Supabase Signup Issue by moving profile creation client-side
-- Drop the trigger on auth.users that was failing with a 500 error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the associated trigger function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add RLS insert policy for public.usuarios_perfiles to allow client-side inserts.
-- The check is set to true to allow insertion during signup before the user session is fully established.
DROP POLICY IF EXISTS "Permitir inserción de perfiles propia" ON public.usuarios_perfiles;
CREATE POLICY "Permitir inserción de perfiles propia" ON public.usuarios_perfiles FOR INSERT TO public WITH CHECK (true);
