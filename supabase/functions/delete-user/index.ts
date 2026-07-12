import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Configuración del servidor incompleta: faltan variables de entorno de Supabase.',
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validar la sesión del usuario que solicita la eliminación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Acceso no autorizado: falta cabecera de autorización.');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      throw new Error('Acceso no autorizado: token inválido.');
    }

    // 2. Verificar que el solicitante sea verdaderamente un Super Administrador
    const { data: profile, error: profileError } = await supabase
      .from('usuarios_perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.rol !== 'super_admin') {
      throw new Error('Permiso denegado: solo el Super Administrador puede eliminar usuarios.');
    }

    // 3. Obtener el ID del usuario a eliminar desde el body
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('Falta el parámetro obligatorio: userId');
    }

    // Evitar que el Super Admin se auto-elimine
    if (userId === user.id) {
      throw new Error('Operación inválida: no puedes eliminar tu propio usuario administrador.');
    }

    // 4. Eliminar el usuario de Supabase Auth
    // Al tener restricción REFERENCES ON DELETE CASCADE, esto eliminará en cascada
    // su fila correspondiente de public.usuarios_perfiles y relaciones.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ message: 'Usuario eliminado exitosamente de Auth y perfiles.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
