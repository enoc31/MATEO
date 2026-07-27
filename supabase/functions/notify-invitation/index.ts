import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, rol, ongNombre, inviteUrl, invitadoPorNombre } = await req.json();

    if (!email || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios: email o inviteUrl' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'La clave RESEND_API_KEY no está configurada en los Secretos de Supabase',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }

    let toList = [email.trim()];
    let sandboxWarning = '';

    // Control Sandbox de Resend:
    // Si estamos usando onboarding@resend.dev (cuenta no verificada / testing),
    // Resend solo permite enviar correos al dueño de la cuenta (gerardoh31@gmail.com).
    // Filtramos la lista para evitar que Resend rebote la petición.
    if (SENDER_EMAIL === 'onboarding@resend.dev') {
      const originalTo = toList.join(', ');
      if (email.toLowerCase() !== 'gerardoh31@gmail.com') {
        toList = ['gerardoh31@gmail.com'];
        sandboxWarning = `<p style="color: #ef4444; font-size: 12px; background: #fee2e2; padding: 8px; border-radius: 6px; margin-bottom: 16px;">
          <strong>[Modo Prueba Sandbox de Resend]</strong> Este correo de invitación originalmente iba dirigido a: <code>${originalTo}</code>, pero fue redirigido al correo del administrador principal (${toList[0]}) debido a las restricciones de la cuenta gratuita en modo Sandbox de Resend.<br/>
          <em>Para enviar correos a cualquier dominio en producción, verifica tu dominio propio en el panel de Resend.</em>
        </p>`;
      }
    }

    // Petición a la API de Resend para enviar la invitación por correo
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `MATEO Audit <${SENDER_EMAIL}>`,
        to: toList,
        subject: `📩 Has sido invitado a unirte a ${ongNombre || 'MATEO'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="https://mateo-wine.vercel.app/mateo_logo.png" alt="MATEO Logo" style="height: 64px; object-fit: contain; border-radius: 12px;" />
            </div>
            ${sandboxWarning}
            <h2 style="color: #0f172a; margin-bottom: 16px; font-size: 20px; font-weight: 700;">¡Has sido invitado a formar parte del equipo!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
              <strong>${invitadoPorNombre || 'Un administrador'}</strong> te ha invitado a unirte a la organización <strong>${ongNombre || 'MATEO'}</strong> en el sistema de auditoría y donaciones MATEO.
            </p>
            <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; line-height: 1.8;">
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Organización:</strong> <span style="color: #0f172a;">${ongNombre || 'MATEO'}</span></p>
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Rol Asignado:</strong> <span style="color: #0f172a;">${rol ? rol.toUpperCase() : 'MIEMBRO'}</span></p>
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Correo Invitado:</strong> <span style="color: #0f172a;">${email}</span></p>
            </div>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
              Haz clic en el siguiente botón para establecer tu contraseña y activar tu cuenta:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #800020; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Aceptar Invitación y Activar Cuenta
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br/>
              <a href="${inviteUrl}" style="color: #800020; word-break: break-all;">${inviteUrl}</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
              Este mensaje fue enviado por el sistema de invitaciones de MATEO.
            </p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
