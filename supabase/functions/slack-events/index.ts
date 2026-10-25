// ============================================================
// slack-events/index.ts
// Supabase Edge Function: Webhook receptor de eventos de Slack
// - Maneja el desafío URL verification de Slack (url_verification)
// - Responde a menciones (@mateo) y mensajes directos (DMs)
// - Publica automáticamente la pantalla de inicio (app_home_opened)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SLACK_BOT_TOKEN =
  Deno.env.get('SLACK_BOT_TOKEN') || 'xoxb-11707506536257-12408012454738-5ORkQ1Krf3dzTWB9ATmI756Z';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Publicar vista Home (App Home) ────────────────────────────
async function publishHomeView(userId: string): Promise<void> {
  const payload = {
    user_id: userId,
    view: {
      type: 'home',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🏛️ Bienvenido a MATEO', emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Plataforma de Auditoría, Donaciones y Gestión Eclesial*\n¡Hola! Soy *Mateo*, tu asistente virtual y canal de notificaciones para revisores y auditores.',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✨ *¿Qué puedo hacer por ti?*\n• 📊 *Resúmenes diarios de auditoría:* Notifico requisiciones pendientes, gastos sin soporte y presupuestos por vencer.\n• 🔔 *Alertas en tiempo real:* Notificaciones directas sobre aprobaciones y donaciones.\n• 📑 *Seguimiento del Checklist de Revisión:* Monitoreo del checklist de cambios y mejoras para la congregación.',
          },
        },
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🚀 Ir a MATEO (App)', emoji: true },
              url: 'https://mateo-wine.vercel.app',
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📋 Canal de Revisores (#C0CBJMA2NK1)',
                emoji: true,
              },
              url: 'https://mateo-gk06971.slack.com/archives/C0CBJMA2NK1',
            },
          ],
        },
      ],
    },
  };

  await fetch('https://slack.com/api/views.publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
}

// ── Enviar mensaje a Slack ────────────────────────────────────
async function postMessage(channel: string, text: string, threadTs?: string): Promise<void> {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      text,
      thread_ts: threadTs,
    }),
  });
}

// ── Generar respuesta conversacional ──────────────────────────
function generateBotReply(incomingText: string): string {
  const lower = incomingText.toLowerCase();

  if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
    return (
      '¡Hola! 👋 Soy *Mateo*, el asistente de la plataforma de auditoría y gestión de donaciones.\n\n' +
      '¿En qué puedo ayudarte hoy?\n' +
      '• Escribe *resumen* para ver los pendientes de auditoría.\n' +
      '• Escribe *checklist* para consultar los puntos de revisión técnica.\n' +
      '• O visita la plataforma en: https://mateo-wine.vercel.app'
    );
  }

  if (
    lower.includes('que puedes hacer') ||
    lower.includes('ayuda') ||
    lower.includes('help') ||
    lower.includes('funciones')
  ) {
    return (
      '🤖 *Funcionalidades de Mateo:*\n' +
      '1. 📊 *Auditoría Contable:* Detección de gastos sin comprobante, requisiciones por autorizar y cuentas sin conciliar.\n' +
      '2. 📑 *Control de Cambios:* Seguimiento del checklist de revisiones de los evaluadores.\n' +
      '3. 🔔 *Notificaciones Automáticas:* Envío de reportes diarios al canal #C0CBJMA2NK1 a las 8:00 AM.\n' +
      '4. 🌐 *Acceso Directo:* Enlace a la app web de producción y pruebas.'
    );
  }

  if (
    lower.includes('checklist') ||
    lower.includes('maurice') ||
    lower.includes('cambios') ||
    lower.includes('revision')
  ) {
    return (
      '📑 *Checklist de Revisiones de la Plataforma MATEO:*\n' +
      '1. *Terminología y UI:* Uso uniforme de "congregación", ampliación de encabezados.\n' +
      '2. *Formulario Congregación:* Personalidad jurídica condicional, RIF J-9 dígitos, selector de 17 denominaciones.\n' +
      '3. *Gestión de Miembros:* Documento de identidad inmutable, teléfonos con formato +58, selector de bautismo (3 opciones).\n' +
      '4. *Archivos & Corrección de Bugs:* Redimensionamiento de imágenes a <2MB y corrección del desfase UTC de fechas.\n' +
      '5. *Integridad de Datos:* Prevención de cascadas accidentales y claves primarias UUID.'
    );
  }

  if (lower.includes('resumen') || lower.includes('pendientes') || lower.includes('auditoria')) {
    return (
      '📊 Para generar el resumen consolidado en tiempo real, puedes hacer clic en *"Enviar resumen ahora"* ' +
      'desde el módulo de **Usuarios y Roles** en MATEO (https://mateo-wine.vercel.app/app/users) ' +
      'o esperar la alerta automática matutina de las 8:00 AM.'
    );
  }

  return (
    `He recibido tu mensaje: _"${incomingText}"_.\n\n` +
    'Estoy activo para apoyar al equipo de revisores. Puedes preguntarme sobre *resumen*, *checklist* o solicitar *ayuda*.'
  );
}

// ── Handler principal ─────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // 1. Desafío de verificación de URL de Slack (URL Verification Handshake)
    if (body.type === 'url_verification') {
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Manejador de eventos de Slack (Event Callback)
    if (body.type === 'event_callback' && body.event) {
      const event = body.event;

      // Evento: Usuario abre la pestaña Home / Inicio de Mateo en Slack
      if (event.type === 'app_home_opened' && event.user) {
        await publishHomeView(event.user);
      }

      // Evento: Mención directa al bot (@mateo) o Mensaje Directo (DM)
      const isMention = event.type === 'app_mention';
      const isDirectMessage = event.type === 'message' && event.channel_type === 'im';

      // Ignorar mensajes enviados por bots para evitar bucles
      if ((isMention || isDirectMessage) && !event.bot_id && event.text) {
        // Limpiar la mención <@U...> del texto si existe
        const cleanText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
        const replyText = generateBotReply(cleanText);

        await postMessage(event.channel, replyText, isMention ? event.ts : undefined);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[slack-events] Error:', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
