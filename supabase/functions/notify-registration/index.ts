import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, nombre, ongId, rolSugerido } = await req.json();

    if (!email || !nombre || !ongId) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios: email, nombre o ongId' }),
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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Obtener el nombre de la ONG
    const { data: ongData } = await supabase.from('ongs').select('nombre').eq('id', ongId).single();
    const ongNombre = ongData?.nombre || 'Organización';

    // 2. Obtener correos del Super Admin
    const { data: superAdmins } = await supabase
      .from('usuarios_perfiles')
      .select('email')
      .eq('rol', 'super_admin');

    // 3. Obtener correos de los Administradores de la ONG
    const { data: ongAdmins } = await supabase
      .from('usuarios_perfiles')
      .select('email')
      .eq('rol', 'administrador')
      .eq('ong_id', ongId);

    // Consolidar destinatarios únicos
    const recipients = new Set<string>();

    superAdmins?.forEach((u) => {
      if (u.email) recipients.add(u.email);
    });
    ongAdmins?.forEach((u) => {
      if (u.email) recipients.add(u.email);
    });

    // Fallback de seguridad si no hay destinatarios configurados en la DB
    if (recipients.size === 0) {
      recipients.add('gerardoh31@gmail.com');
    }

    let toList = Array.from(recipients);
    let sandboxWarning = '';

    // Control Sandbox de Resend:
    // Si estamos usando onboarding@resend.dev (cuenta no verificada / testing),
    // Resend solo permite enviar correos al dueño de la cuenta (gerardoh31@gmail.com).
    // Filtramos la lista para evitar que Resend rebote toda la petición.
    if (SENDER_EMAIL === 'onboarding@resend.dev') {
      const originalTo = toList.join(', ');
      toList = toList.filter((email) => email.toLowerCase() === 'gerardoh31@gmail.com');
      if (toList.length === 0) {
        toList = ['gerardoh31@gmail.com'];
      }
      sandboxWarning = `<p style="color: #ef4444; font-size: 12px; background: #fee2e2; padding: 8px; border-radius: 6px; margin-bottom: 16px;">
        <strong>[Modo Prueba Sandbox]</strong> Este correo originalmente iba dirigido a: <code>${originalTo}</code>, pero fue filtrado y redirigido a ti por limitaciones de la cuenta gratuita de Resend.
      </p>`;
    }

    // Petición a la API de Resend para enviar el correo a todos los administradores
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `MATEO <${SENDER_EMAIL}>`,
        to: toList,
        subject: `👥 Nuevo registro pendiente de aprobación: ${nombre}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="text-align: center; margin-bottom: 25px;">
              <img src="https://mateo-wine.vercel.app/mateo_logo.png" alt="MATEO Logo" style="height: 64px; object-fit: contain; border-radius: 12px;" />
            </div>
            ${sandboxWarning}
            <h2 style="color: #0f172a; margin-bottom: 16px; font-size: 20px; font-weight: 700;">¡Nuevo usuario registrado!</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
              Un nuevo usuario ha solicitado acceso a la plataforma de auditoría <strong>MATEO</strong>:
            </p>
            <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; line-height: 1.8;">
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Nombre Completo:</strong> <span style="color: #0f172a;">${nombre}</span></p>
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Correo Electrónico:</strong> <span style="color: #0f172a;">${email}</span></p>
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Organización (ONG):</strong> <span style="color: #0f172a;">${ongNombre}</span></p>
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Rol Solicitado:</strong> <span style="color: #0f172a;">${rolSugerido}</span></p>
            </div>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
              Este usuario se encuentra en estado <strong>Pendiente de Aprobación</strong> y no podrá acceder a las funciones del sistema hasta que apruebes su registro.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://mateo-wine.vercel.app" style="background-color: #800020; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Ir a Panel de Administración
              </a>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
              Notificación automática del sistema de seguridad MATEO.
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
