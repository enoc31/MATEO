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
      throw new Error('Server configuration error: missing Supabase URL or Service Key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the user making the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: missing authorization header');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Unauthorized: invalid token');
    }

    // Get the calling administrator's profile to know their ONG
    const { data: adminProfile, error: profileError } = await supabase
      .from('usuarios_perfiles')
      .select('rol, ong_id')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      throw new Error('Forbidden: could not verify administrator profile');
    }

    if (adminProfile.rol !== 'administrador' && adminProfile.rol !== 'super_admin') {
      throw new Error('Forbidden: Only administrators can create users');
    }

    const { email, password, nombre_completo, rol, ong_id } = await req.json();

    if (!email || !password || !nombre_completo || !rol) {
      throw new Error('Missing required fields');
    }

    // The ong_id to assign: use the one from the request body (if super_admin), or force to admin's own ONG
    const targetOngId =
      adminProfile.rol === 'super_admin' ? ong_id || adminProfile.ong_id : adminProfile.ong_id;

    if (!targetOngId) {
      throw new Error('Cannot determine target ONG for user creation');
    }

    // 1. Create Auth User with complete metadata including ong_id
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_completo,
        rol,
        ong_id: targetOngId,
        aprobado: true,
      },
    });

    if (createError) throw createError;

    // 2. Wait briefly to allow the DB trigger "on_auth_user_created" to finish inserting the row
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 3. Upsert the profile with correct role, ong_id and auto-approve
    // This ensures correct data even if the trigger used stale logic
    const { error: upsertError } = await supabase.from('usuarios_perfiles').upsert({
      id: authData.user.id,
      email,
      nombre_completo,
      rol,
      aprobado: true,
      ong_id: targetOngId,
    });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ user: authData.user, message: 'User created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
