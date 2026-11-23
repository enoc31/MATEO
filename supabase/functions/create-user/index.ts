import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

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
      .select('rol, ong_id, nombre_completo')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      throw new Error('Forbidden: could not verify administrator profile');
    }

    if (
      adminProfile.rol !== 'administrador' &&
      adminProfile.rol !== 'admin_iglesia' &&
      adminProfile.rol !== 'super_admin'
    ) {
      throw new Error('Forbidden: Only administrators can create users');
    }

    const { email, password, nombre_completo, rol, ong_id } = await req.json();

    if (!email || !password || !nombre_completo || !rol) {
      throw new Error('Missing required fields: email, password, nombre_completo, rol');
    }

    // The ong_id to assign: super_admin can specify, admin uses their own ONG
    const targetOngId =
      adminProfile.rol === 'super_admin' ? ong_id || adminProfile.ong_id : adminProfile.ong_id;

    if (!targetOngId) {
      throw new Error('Cannot determine target ONG for user creation');
    }

    // Get ONG name for the welcome email
    const { data: ongData } = await supabase
      .from('ongs')
      .select('nombre')
      .eq('id', targetOngId)
      .single();
    const ongNombre = ongData?.nombre || 'la Organización';

    // 1. Create Auth User — aprobado: false (PENDIENTE DE ACTIVACIÓN)
    // El usuario pasa a ACTIVO automáticamente en su primer inicio de sesión.
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_completo,
        rol,
        ong_id: targetOngId,
        aprobado: false,
      },
    });

    if (createError) throw createError;

    // 2. Wait briefly to allow the DB trigger to run
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 3. Upsert the profile as PENDIENTE DE ACTIVACIÓN (aprobado: false)
    const { error: upsertError } = await supabase.from('usuarios_perfiles').upsert({
      id: authData.user.id,
      email,
      nombre_completo,
      rol,
      aprobado: false,
      ong_id: targetOngId,
    });

    if (upsertError) throw upsertError;

    // 4. Send welcome email with credentials via Resend (if configured)
    let emailResult: { sent: boolean; warning?: string } = { sent: false };

    if (RESEND_API_KEY) {
      const loginUrl = `${req.headers.get('origin') || 'https://mateo-wine.vercel.app'}/login`;

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `MATEO Audit <${SENDER_EMAIL}>`,
          to: [email],
          subject: `🎉 Tu cuenta en MATEO ha sido creada — ${ongNombre}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="text-align: center; margin-bottom: 25px;">
                <img src="https://mateo-wine.vercel.app/mateo_logo.png" alt="MATEO Logo" style="height: 64px; object-fit: contain; border-radius: 12px;" />
              </div>
              <h2 style="color: #0f172a; margin-bottom: 16px; font-size: 20px; font-weight: 700;">¡Bienvenido/a a MATEO, ${nombre_completo}!</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
                <strong>${adminProfile.nombre_completo || 'Un Administrador'}</strong> ha creado tu cuenta en el sistema de auditoría y donaciones <strong>MATEO</strong> para la organización <strong>${ongNombre}</strong>.
              </p>
              <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">
                Tu cuenta está lista. Para activarla, inicia sesión con las siguientes credenciales:
              </p>
              <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; line-height: 2;">
                <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Organización:</strong> <span style="color: #0f172a;">${ongNombre}</span></p>
                <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Rol Asignado:</strong> <span style="color: #0f172a;">${rol.toUpperCase()}</span></p>
                <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Correo de acceso:</strong> <span style="color: #0f172a;">${email}</span></p>
                <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Contraseña temporal:</strong> <span style="color: #800020; font-weight: 700; font-family: monospace;">${password}</span></p>
              </div>
              <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">
                ⚠️ Tu cuenta aparece como <strong>Pendiente de Activación</strong> hasta que inicies sesión por primera vez. Una vez que ingreses, quedará activada automáticamente.
              </p>
              <p style="font-size: 13px; color: #ef4444; margin-bottom: 20px;">
                🔒 Por seguridad, cambia tu contraseña después de iniciar sesión.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background-color: #800020; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  Activar mi Cuenta — Iniciar Sesión
                </a>
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
                Este mensaje fue enviado automáticamente por el sistema MATEO. Si tienes dudas, contacta a tu administrador.
              </p>
            </div>
          `,
        }),
      });

      const resendResult = await resendResponse.json();

      if (resendResponse.ok) {
        emailResult = { sent: true };
      } else {
        console.error('Resend error:', resendResult);
        emailResult = {
          sent: false,
          warning: `Correo no enviado: ${resendResult?.message || resendResult?.error || 'Error desconocido de Resend'}`,
        };
      }
    } else {
      emailResult = {
        sent: false,
        warning: 'RESEND_API_KEY no configurada — correo de bienvenida no enviado',
      };
    }

    return new Response(
      JSON.stringify({
        user: authData.user,
        message: 'User created successfully',
        emailSent: emailResult.sent,
        emailWarning: emailResult.warning,
      }),
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
