import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, traceparent, tracestate, baggage, x-supabase-api-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error: missing Supabase credentials');
    }

    // Admin client — can create users without email confirmation
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, nombreCompleto, password } = await req.json();

    if (!token || !nombreCompleto || !password) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos: token, nombreCompleto, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Validate the invitation token
    const { data: inv, error: invError } = await supabase
      .from('invitaciones')
      .select('*, ongs(nombre)')
      .eq('token', token)
      .eq('estado', 'pendiente')
      .single();

    if (invError || !inv) {
      return new Response(
        JSON.stringify({
          error: 'La invitación no existe, ya fue utilizada o ha expirado.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check expiration
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Esta invitación ha expirado. Solicita una nueva.' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Create the Auth user with email already confirmed (no email verification required)
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: inv.email,
      password,
      email_confirm: true, // Skip email confirmation — invitation IS the confirmation
      user_metadata: {
        nombre_completo: nombreCompleto.trim(),
        rol: inv.rol,
        ong_id: inv.ong_id,
        aprobado: true,
      },
    });

    if (createError) {
      // If user already exists, try to update their password instead
      if (createError.message.includes('already') || createError.code === 'email_exists') {
        // Find existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u: { email?: string }) => u.email === inv.email,
        );

        if (!existingUser) throw createError;

        // Update password for the existing user
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: {
            nombre_completo: nombreCompleto.trim(),
            rol: inv.rol,
            ong_id: inv.ong_id,
            aprobado: true,
          },
        });

        // Upsert profile
        await supabase.from('usuarios_perfiles').upsert(
          {
            id: existingUser.id,
            email: inv.email,
            nombre_completo: nombreCompleto.trim(),
            rol: inv.rol,
            aprobado: true,
            ong_id: inv.ong_id,
          },
          { onConflict: 'id' },
        );

        // Mark invitation as accepted
        await supabase.from('invitaciones').update({ estado: 'aceptada' }).eq('token', token);

        return new Response(JSON.stringify({ success: true, email: inv.email }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw createError;
    }

    const newUserId = authData.user.id;

    // 3. Wait briefly for DB trigger, then upsert profile with correct data
    await new Promise((resolve) => setTimeout(resolve, 600));

    await supabase.from('usuarios_perfiles').upsert(
      {
        id: newUserId,
        email: inv.email,
        nombre_completo: nombreCompleto.trim(),
        rol: inv.rol,
        aprobado: true,
        ong_id: inv.ong_id,
      },
      { onConflict: 'id' },
    );

    // 4. Mark invitation as accepted
    await supabase.from('invitaciones').update({ estado: 'aceptada' }).eq('token', token);

    return new Response(JSON.stringify({ success: true, email: inv.email }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[accept-invitation] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
