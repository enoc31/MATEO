// ============================================================
// scripts/mateo-service.cjs
// Servicio de escucha y respuesta en tiempo real para Mateo en Slack
// Monitorea canales directos y menciones para responder en 1-2 segundos.
// ============================================================

const https = require('https');
const { generateSmartReply } = require('./mateo-knowledge.cjs');

const SLACK_BOT_TOKEN =
  process.env.SLACK_BOT_TOKEN || 'xoxb-11707506536257-12408012454738-5ORkQ1Krf3dzTWB9ATmI756Z';
const BOT_USER_ID = 'U0CC00CDCMQ';

const CHANNELS_TO_WATCH = [
  'D0CCUGSK7J4', // ENOC / gerardoh31
  'D0CCUGSKCKS', // Anyul Rivas
  'D0CBY6Z2HQE', // Maurice Eustache
  'C0CBJMA2NK1', // Canal general de revisores
];

const lastSeenTimestamps = {};

function slackGet(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(
      'https://slack.com/api/' + endpoint,
      {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      },
    ).on('error', reject);
  });
}

function slackPost(channel, text, threadTs) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      channel,
      text,
      thread_ts: threadTs,
    });

    const req = https.request(
      'https://slack.com/api/chat.postMessage',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function generateBotReply(incomingText) {
  const lower = (incomingText || '').toLowerCase().trim();

  if (
    lower.includes('tiempo') ||
    lower.includes('tarda') ||
    lower.includes('demora') ||
    lower.includes('velocidad')
  ) {
    return (
      '⚡ *Tiempo de Respuesta Actual:* Mis respuestas ahora son prácticamente inmediatas (entre 1 y 2 segundos).\n\n' +
      'Tengo un demonio de monitoreo en tiempo real activo para que puedas hacerme cualquier consulta sin demoras.'
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

  if (
    lower.includes('hola') ||
    lower.includes('buenos') ||
    lower.includes('buenas') ||
    lower.includes('saludos')
  ) {
    return (
      '¡Hola! 👋 Soy *Mateo*, tu asistente para la plataforma de auditoría y gestión de donaciones.\n\n' +
      '¿En qué puedo ayudarte hoy?\n' +
      '• Escribe *estado* o *main* para ver el estado de la plataforma.\n' +
      '• Escribe *checklist* para consultar los puntos de revisión técnica.\n' +
      '• Escribe *resumen* para ver los pendientes de auditoría.\n' +
      '• O visita la plataforma en: https://mateo-wine.vercel.app'
    );
  }

  if (lower.includes('que puedes hacer') || lower.includes('ayuda') || lower.includes('help')) {
    return (
      '🤖 *Funcionalidades de Mateo:*\n' +
      '1. 📊 *Auditoría Contable:* Detección de gastos sin comprobante, requisiciones por autorizar e ingresos bancarios sin conciliar.\n' +
      '2. 📑 *Control de Cambios:* Seguimiento del checklist de revisiones técnicas del equipo.\n' +
      '3. 🔔 *Notificaciones Automáticas:* Envío de reportes diarios al canal #C0CBJMA2NK1 cada día hábil a las 8:00 AM.\n' +
      '4. 🌐 *Acceso Directo:* Enlace a la app web de producción y pruebas.'
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
    'Estoy activo para apoyar al equipo de revisores en tiempo real. Puedes preguntarme sobre *estado*, *main*, *checklist*, *resumen* o solicitar *ayuda*.'
  );
}

async function init() {
  console.log('[Servicio Mateo] Inicializando monitor en tiempo real...');

  // Registrar el último timestamp existente de cada canal para no responder mensajes viejos
  for (const ch of CHANNELS_TO_WATCH) {
    try {
      const res = await slackGet(`conversations.history?channel=${ch}&limit=1`);
      if (res.ok && res.messages && res.messages.length > 0) {
        lastSeenTimestamps[ch] = res.messages[0].ts;
      } else {
        lastSeenTimestamps[ch] = (Date.now() / 1000).toString();
      }
    } catch {
      lastSeenTimestamps[ch] = (Date.now() / 1000).toString();
    }
  }

  console.log('[Servicio Mateo] Canales inicializados. Escuchando activamente cada 2 segundos...');

  // Bucle de monitoreo continuo
  setInterval(async () => {
    for (const ch of CHANNELS_TO_WATCH) {
      try {
        const lastTs = lastSeenTimestamps[ch] || '0';
        const res = await slackGet(`conversations.history?channel=${ch}&limit=5`);

        if (res.ok && res.messages) {
          const newMessages = res.messages.filter(
            (m) =>
              parseFloat(m.ts) > parseFloat(lastTs) &&
              m.user !== BOT_USER_ID &&
              !m.bot_id &&
              m.text,
          );

          if (newMessages.length > 0) {
            // Actualizar timestamp
            lastSeenTimestamps[ch] = res.messages[0].ts;

            // Procesar los mensajes en orden cronológico
            for (const msg of newMessages.reverse()) {
              const isDM = ch.startsWith('D');
              const isMention = msg.text.includes(`<@${BOT_USER_ID}>`);

              // En DMs responder siempre; en canales públicos sólo si lo mencionan
              if (isDM || isMention) {
                console.log(`[Servicio Mateo] Nuevo mensaje en ${ch}: "${msg.text}"`);
                const cleanText = msg.text.replace(new RegExp(`<@${BOT_USER_ID}>`, 'g'), '').trim();
                const reply = await generateSmartReply(cleanText);

                await slackPost(ch, reply, isMention ? msg.ts : undefined);
                console.log(`[Servicio Mateo] Respuesta inteligente enviada a ${ch}`);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Servicio Mateo] Error en canal ${ch}:`, err.message);
      }
    }
  }, 2000);
}

init();
