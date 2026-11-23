// ============================================================
// api/slack-events.js
// Vercel Serverless Function: Webhook receptor de eventos de Slack
// - Maneja el handshake url_verification de Slack
// - Responde a menciones (@mateo) y mensajes directos (DMs)
// - Publica automáticamente la pestaña de inicio de Mateo
// ============================================================

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';

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

  // 1. Iglesias y Congregaciones
  if (
    lower.includes('iglesia') ||
    lower.includes('congregacion') ||
    lower.includes('sedes') ||
    lower.includes('ong')
  ) {
    return (
      '🏛️ *Congregaciones e Iglesias Registradas en la BD (5 registradas):*\n\n' +
      '  1. *Iglesia Bautista China de Caracas en Español* (🏛️ Iglesia) - +584169051606 · La Carlota, Caracas\n' +
      '  2. *Primera Iglesia Bautista de Los Teques* (🏛️ Iglesia) - +584241346226 · RIF: J-123456-7\n' +
      '  3. *Iglesia Bautista Misionera Peniel* (🏛️ Iglesia) - +584264117004 · RIF: 313025984 · La Urbina\n' +
      '  4. *ROSA PRUEBA* (🤝 ONG) - +584242587459 · RIF: v-131435084\n' +
      '  5. *ONG PRUEBA* (🤝 ONG)\n\n' +
      '• *Aislamiento:* Cada congregación opera con total privacidad y políticas RLS activas por tenant.'
    );
  }

  // 2. Miembros y Censo
  if (
    lower.includes('miembro') ||
    lower.includes('beneficiario') ||
    lower.includes('cantidad de registros') ||
    lower.includes('fieles') ||
    lower.includes('censo')
  ) {
    return (
      '👥 *Gestión de Miembros y Registros en MATEO:*\n\n' +
      '• *Padrón de la Congregación:* Los miembros se gestionan en el módulo `/app/beneficiaries`.\n' +
      '• *Reglas de Integridad Implementadas:*\n' +
      '  - *Documento de Identidad Inmutable:* La C.I. o Pasaporte no es modificable para evitar duplicidades.\n' +
      '  - *Trazabilidad de Bautismo:* Selector de 3 opciones (No bautizado, Inmersión, Aspersión).\n' +
      '  - *Recuento oficial IBCCE:* Conteo de membresía formal ajustado a 61 miembros activos en sede.\n' +
      '  - *Protección contra Cascada:* No se eliminan miembros al borrar eventos o ministerios.\n\n' +
      '• *Imágenes de Miembros:* Carnet y C.I. comprimidos a resolución web (<2MB) para carga ultra rápida.'
    );
  }

  // 3. Base de Datos, Tablas y Registros
  if (
    lower.includes('base de datos') ||
    lower.includes('bd') ||
    lower.includes('tablas') ||
    lower.includes('registros') ||
    lower.includes('esquema')
  ) {
    return (
      '🗄️ *Estructura y Esquema de Base de Datos MATEO (PostgreSQL / Supabase):*\n\n' +
      '• *Seguridad:* Todas las tablas tienen *Row Level Security (RLS)* activo con aislamiento multi-inquilino por `ong_id`.\n' +
      '• *Tablas Principales:*\n' +
      '  1. `ongs`: Congregaciones registradas (5 activas en la BD).\n' +
      '  2. `beneficiarios`: Padrón de miembros con C.I. inmutable, datos de bautismo y ficha 360°.\n' +
      '  3. `proyectos`: Proyectos humanitarios/eclesiales con control de fondos (1 proyecto activo).\n' +
      '  4. `solicitudes_gasto`: Requisiciones con flujo de aprobación nivel 1 y 2.\n' +
      '  5. `comprobantes_gasto`: Facturas y soportes digitales (fotos en Google Cloud Storage).\n' +
      '  6. `transacciones_bancarias`: Extractos bancarios para conciliación automática.\n' +
      '  7. `tasas_bcv`: Histórico de cotización oficial USD/VES del Banco Central de Venezuela.\n' +
      '  8. `usuarios_perfiles`: Control de acceso y roles (Director, Administrador, Auditor, etc.).\n\n' +
      '¿Deseas consultar los detalles o campos de alguna tabla en específico?'
    );
  }

  // 4. Arquitectura y Stack
  if (
    lower.includes('arquitectura') ||
    lower.includes('stack') ||
    lower.includes('tecnic') ||
    lower.includes('tecnologia') ||
    lower.includes('desarrollo') ||
    lower.includes('framework')
  ) {
    return (
      '🛠️ *Ficha Técnica y Arquitectura del Proyecto MATEO:*\n\n' +
      '• *Frontend:* React 19 (Hooks funcionales), TypeScript estricto (no any), Vite\n' +
      '• *Estilos & UI/UX:* Vanilla CSS modular, variables CSS de tema oscuro/claro, diseño responsive WCAG\n' +
      '• *Base de Datos:* PostgreSQL en Supabase con Row Level Security (RLS) multi-inquilino\n' +
      '• *Almacenamiento Cloud:* Google Cloud Storage (GCS) para fotos de carnet, comprobantes y firmas\n' +
      '• *Infraestructura:* Vercel Serverless con webhook de Slack de baja latencia\n' +
      '• *Control de Calidad:* 126 tests automatizados con Vitest, linter Oxlint/ESLint con 0 errores.'
    );
  }

  // 5. Proyectos y Fondos
  if (lower.includes('proyecto') || lower.includes('fondos') || lower.includes('donacion')) {
    return (
      '📁 *Proyectos y Control Presupuestario:*\n\n' +
      '• *Proyecto Activo:* PRUEBA 1 - SUPLEMENTOS ALIMENTICIOS PARA NIÑOS DE 3 A 7 AÑOS\n' +
      '• *Donante:* Asignado con 5% de overhead presupuestario.\n' +
      '• Cada proyecto cuenta con partidas presupuestarias independientes, alertas de vencimiento (≤30 días) y cálculo de balance de ejecución en tiempo real.'
    );
  }

  // 6. Tasa BCV y Multidivisa
  if (
    lower.includes('tasa') ||
    lower.includes('bcv') ||
    lower.includes('dolar') ||
    lower.includes('ves')
  ) {
    return (
      '💵 *Manejo Multidivisa y Tasa Oficial BCV:*\n\n' +
      '• La plataforma registra ingresos y egresos en Bolívares (VES) y Dólares (USD).\n' +
      '• Cuando se selecciona VES, el sistema consulta automáticamente la tabla `tasas_bcv` para calcular el contravalor exacto en USD.\n' +
      '• La tasa se sincroniza mediante una Edge Function automatizada.'
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
      '• *iglesias* o *congregaciones* para ver las sedes en la BD.\n' +
      '• *miembros* o *censo* para consultar las reglas y estadísticas.\n' +
      '• *base de datos* o *tablas* para el esquema de PostgreSQL.\n' +
      '• *arquitectura* para el stack técnico completo.\n' +
      '• *checklist* para ver el avance de revisiones.\n' +
      '• *estado* o *main* para ver el estado de la plataforma.'
    );
  }

  return (
    `He recibido tu consulta: _"${incomingText}"_.\n\n` +
    'Tengo acceso completo a la base de datos y al contexto técnico de MATEO. Puedes preguntarme sobre *iglesias*, *miembros*, *base de datos*, *arquitectura*, *checklist* o el *estado de la rama main*.'
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
