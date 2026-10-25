// ============================================================
// api/slack-events.js
// Vercel Serverless Function: Webhook receptor de eventos de Slack
// - Maneja el handshake url_verification de Slack
// - Responde a menciones (@mateo) y mensajes directos (DMs)
// - Publica automáticamente la pestaña de inicio de Mateo
// ============================================================

const SLACK_BOT_TOKEN =
  process.env.SLACK_BOT_TOKEN || 'xoxb-11707506536257-12408012454738-5ORkQ1Krf3dzTWB9ATmI756Z';

async function publishHomeView(userId) {
  try {
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
              text: '✨ *¿Qué puedo hacer por ti?*\n• 📊 *Resúmenes diarios de auditoría:* Notifico requisiciones pendientes, gastos sin soporte y presupuestos por vencer.\n• 🔔 *Alertas en tiempo real:* Notificaciones de revisión sobre aprobaciones y donaciones.\n• 📑 *Seguimiento del Checklist de Revisión:* Monitoreo continuo de los cambios solicitados por el equipo de revisores.',
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
  } catch (err) {
    console.error('Error publishing Home tab in Slack:', err);
  }
}

async function postMessage(channel, text, threadTs) {
  try {
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
  } catch (err) {
    console.error('Error posting message to Slack:', err);
  }
}

function generateBotReply(incomingText) {
  const lower = (incomingText || '').toLowerCase();

  if (lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
    return (
      '¡Hola! 👋 Soy *Mateo*, tu asistente para la plataforma de auditoría y gestión de donaciones.\n\n' +
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
      '1. 📊 *Auditoría Contable:* Detección de gastos sin comprobante, requisiciones por autorizar e ingresos bancarios sin conciliar.\n' +
      '2. 📑 *Control de Cambios:* Seguimiento del checklist de revisiones técnicas del equipo.\n' +
      '3. 🔔 *Notificaciones Automáticas:* Envío de reportes diarios al canal #C0CBJMA2NK1 cada día hábil a las 8:00 AM.\n' +
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

  if (
    lower.includes('rama') ||
    lower.includes('main') ||
    lower.includes('produccion') ||
    lower.includes('despliegue') ||
    lower.includes('version') ||
    lower.includes('estado')
  ) {
    return (
      '📌 *Estado de la Plataforma MATEO:*\n' +
      '• *Rama Main (Producción):* Activa y sincronizada en https://mateo-wine.vercel.app\n' +
      '• *Rama de Pruebas:* `product/iglesias` (126 pruebas pasando, 0 errores).\n' +
      '• *Últimas mejoras:* Responsividad móvil, accesibilidad WCAG, recuperación de contraseñas y panel de Slack integrado.\n\n' +
      '¿Deseas que verifique algún dato específico de la base de datos o de los módulos?'
    );
  }

  if (lower.includes('resumen') || lower.includes('pendientes') || lower.includes('auditoria')) {
    return (
      '📊 Para generar el resumen consolidado en tiempo real, puedes hacer clic en *"Enviar resumen ahora"* ' +
      'desde el módulo de **Usuarios y Roles** en MATEO (https://mateo-wine.vercel.app/app/users) ' +
      'o esperar la alerta automática matutina de las 8:00 AM.'
    );
  }

  if (lower === '?' || lower.length === 0) {
    return (
      '¡Hola! 👋 Estoy disponible para responder tus preguntas.\n' +
      'Puedes escribirme:\n' +
      '• *estado* o *main* para ver el estado de la plataforma.\n' +
      '• *checklist* para ver el avance de revisiones.\n' +
      '• *resumen* para ver los pendientes de auditoría.\n' +
      '• *ayuda* para más opciones.'
    );
  }

  return (
    `He recibido tu consulta: _"${incomingText}"_.\n\n` +
    'Estoy activo para apoyar al equipo de revisores. Puedes preguntarme sobre *estado*, *main*, *checklist*, *resumen* o solicitar *ayuda*.'
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ignorar reintentos de Slack para evitar procesar dos veces
  if (req.headers['x-slack-retry-num']) {
    return res.status(200).json({ ok: true, note: 'ignored_retry' });
  }

  // Parse body si viene como string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  // 1. Handshake de verificación de URL de Slack
  if (body.type === 'url_verification') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ challenge: body.challenge });
  }

  // 2. Manejador de eventos de Slack
  if (body.type === 'event_callback' && body.event) {
    const event = body.event;

    // Abrir pantalla de inicio
    if (event.type === 'app_home_opened' && event.user) {
      await publishHomeView(event.user);
    }

    // Detección robusta de mención o mensaje directo (Canal que empieza por 'D' o channel_type 'im')
    const isMention = event.type === 'app_mention';
    const isChannelDM = event.channel && event.channel.startsWith('D');
    const isDirectMessage =
      event.type === 'message' && (event.channel_type === 'im' || isChannelDM);

    // Evitar responderse a sí mismo (Mateo bot_id o user_id)
    const isFromSelf = event.bot_id || event.user === 'U0CC00CDCMQ';

    if ((isMention || isDirectMessage) && !isFromSelf && event.text) {
      const cleanText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
      const replyText = generateBotReply(cleanText);
      await postMessage(event.channel, replyText, isMention ? event.ts : undefined);
    }
  }

  return res.status(200).json({ ok: true });
}
