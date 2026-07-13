import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de peticiones CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, nombre } = await req.json();

    if (!email || !nombre) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios: email o nombre' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
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

    // Control Sandbox de Resend:
    // Si estamos usando onboarding@resend.dev (cuenta no verificada / testing),
    // Resend solo permite enviar correos al dueño de la cuenta (gerardoh31@gmail.com).
    // Redirigimos el destino para evitar que la API devuelva un error 403.
    let finalRecipient = email;
    let sandboxWarning = '';
    if (SENDER_EMAIL === 'onboarding@resend.dev') {
      finalRecipient = 'gerardoh31@gmail.com';
      sandboxWarning = `<p style="color: #ef4444; font-size: 12px; background: #fee2e2; padding: 8px; border-radius: 6px; margin-bottom: 16px;">
        <strong>[Modo Prueba Sandbox]</strong> Este correo originalmente iba dirigido a <code>${email}</code>, pero fue redirigido a ti por limitaciones de la cuenta gratuita de Resend.
      </p>`;
    }

    // Petición a la API de Resend para enviar el correo
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `MATEO <${SENDER_EMAIL}>`, // Usa el correo configurado o el de onboarding
        to: finalRecipient,
        subject: '¡Tu cuenta ha sido aprobada! 🎉',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="https://mateo-wine.vercel.app/mateo_logo.png" alt="MATEO Logo" style="height: 64px; object-fit: contain; border-radius: 12px;" />
            </div>
            ${sandboxWarning}
            <h2 style="color: #0f172a; margin-bottom: 16px; font-size: 22px; font-weight: 700;">¡Hola, ${nombre}!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
              Nos complace informarte que tu solicitud de registro en la plataforma de auditoría de donaciones <strong>MATEO</strong> ha sido **aprobada** por un administrador.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
              Ya puedes iniciar sesión en el sistema con tus credenciales registradas y comenzar a colaborar con tu organización.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://mateo-wine.vercel.app" style="background-color: #800020; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.2s;">
                Ingresar al Sistema
              </a>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 12px; color: #64748b; text-align: center; line-height: 1.4;">
              Este es un correo automático enviado por el sistema de seguridad MATEO. Por favor, no respondas a este mensaje.
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
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
