// ============================================================
// scripts/mateo-commits-reporter.cjs
// Reporte Diario de Commits y Validación de QA para el Agente Mateo
// Se ejecuta diariamente a las 08:00 PM y publica en #commits
// ============================================================

const { execSync } = require('child_process');
const https = require('https');

const SLACK_BOT_TOKEN =
  process.env.SLACK_BOT_TOKEN || 'xoxb-11707506536257-12408012454738-5ORkQ1Krf3dzTWB9ATmI756Z';
const DEFAULT_COMMITS_CHANNEL = process.env.SLACK_COMMITS_CHANNEL || 'commits';
const QA_REVIEWS_CHANNEL = process.env.SLACK_QA_REVIEWS_CHANNEL || 'C0CBJMA2NK1';

// Base de conocimiento del checklist oficial de QA (#qa-reviews)
const QA_CHECKLIST_KNOWLEDGE = [
  {
    categoria: 'Terminología y UI Global',
    items: [
      'Estandarizar término "congregación" (evitar "templo")',
      'Cambiar título inicial a "Datos Fundamentales de la Congregación"',
      'Retirar texto de ejemplo "Bautista"',
      'Ampliar contenedor de nombre de congregación en header',
      'Logo de congregación junto al nombre',
      'Renombrar a "Gestión de Miembros" y "Perfil de la Congregación"',
    ],
    keywords: ['congregacion', 'templo', 'header', 'terminologia', 'logo', 'dashboard'],
  },
  {
    categoria: 'Formulario: Datos de Congregación y Administrador',
    items: [
      'Selector booleano de Personalidad Jurídica propia',
      'Razón social y RIF condicionales a personalidad jurídica',
      'Validar RIF con prefijo J- y 9 dígitos estrictos',
      'Selector desplegable ordenado de 17 denominaciones',
      'Administrador principal con selector V/E o Pasaporte numérico',
    ],
    keywords: [
      'personalidad juridica',
      'rif',
      'denominacion',
      'organizacion',
      'saas',
      'razon social',
    ],
  },
  {
    categoria: 'Registro y Gestión de Miembros',
    items: [
      'Cédula / Pasaporte: inmutable tras registro (Primary Identifier)',
      'Validación de solo dígitos en documento',
      'Teléfonos con código de país (+58) y formato estandarizado',
      'Selector de Bautismo con 3 opciones exactas (No bautizado, Inmersión, Aspersión)',
      'Fecha de ingreso en acta opcional/nullable',
      'Áreas ministeriales con opciones expandidas',
    ],
    keywords: [
      'beneficiarios',
      'miembro',
      'cedula',
      'inmutable',
      'bautismo',
      'telefono',
      '+58',
      'membresia',
    ],
  },
  {
    categoria: 'Archivos, Imágenes y Fechas',
    items: [
      'Compresión de cédula a max 800x600 y <2MB',
      'Compresión de foto carnet a max 400px y <1MB',
      'Corrección de desfase UTC (-1 día) en Ficha 360° y fechas',
      'Edición de fecha de ingreso y prevención de fechas autogeneradas',
      'Ajuste en conteo real de miembros en IBCCE',
    ],
    keywords: ['foto', 'carnet', 'compresion', 'utc', 'timezone', 'desfase', 'fecha', 'tamano'],
  },
  {
    categoria: 'Integridad de Datos y Arquitectura',
    items: [
      'Bloqueo de eliminación en cascada accidental de miembros al borrar eventos',
      'Confirmación explícita para acciones destructivas',
      'Baja de miembros individual (1 a 1)',
      'Clave primaria UUID autogenerada para congregaciones (independiente de RIF)',
    ],
    keywords: ['cascada', 'cascade', 'uuid', 'integridad', 'eliminacion', 'rls'],
  },
  {
    categoria: 'Seguridad, Acceso y Autenticación',
    items: [
      'Flujo de recuperación de contraseñas (Forgot / Reset Password)',
      'Acceso administrativo SaaS y portal de gestión de iglesias',
      'Verificación y activación de cuentas de usuarios',
    ],
    keywords: ['auth', 'login', 'password', 'recuperacion', 'forgot', 'saas'],
  },
];

function slackApiCall(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const isPost = method === 'POST';
    const payload = isPost && data ? JSON.stringify(data) : null;

    const options = {
      method,
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    };

    if (payload) {
      options.headers['Content-Type'] = 'application/json; charset=utf-8';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(`https://slack.com/api/${endpoint}`, options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Obtiene el último commit válido en el repositorio actual
 */
function getLatestValidCommit() {
  try {
    const hash = execSync('git log -1 --format=%H').toString().trim();
    const shortHash = execSync('git log -1 --format=%h').toString().trim();
    const author = execSync('git log -1 --format=%an').toString().trim();
    const dateStr = execSync('git log -1 --format=%cd --date=iso').toString().trim();
    const subject = execSync('git log -1 --format=%s').toString().trim();
    const body = execSync('git log -1 --format=%b').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const stats = execSync('git show -1 --stat --oneline').toString().trim();
    const filesChanged = execSync('git diff-tree --no-commit-id --name-only -r HEAD')
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    return {
      isValid: Boolean(hash && hash.length === 40),
      hash,
      shortHash,
      author,
      date: dateStr,
      subject,
      body,
      branch,
      stats,
      filesChanged,
    };
  } catch (error) {
    console.error('[Mateo Commits Reporter] Error al leer git log:', error.message);
    return null;
  }
}

/**
 * Analiza el commit para determinar en qué consiste, bugs resueltos y nuevas características
 */
function analyzeCommit(commit) {
  if (!commit || !commit.isValid) {
    return {
      description: 'No se detectó un commit válido reciente en el repositorio.',
      bugsFixed: [],
      newFeatures: [],
      type: 'unknown',
      scope: 'general',
    };
  }

  const { subject, body, filesChanged } = commit;
  const fullText = `${subject}\n${body}`.toLowerCase();

  // Parse Conventional Commits: tipo(scope): descripcion
  const match = subject.match(/^([a-z]+)(?:\(([^)]+)\))?:\s*(.+)$/i);
  const type = match ? match[1].toLowerCase() : 'update';
  const scope = match && match[2] ? match[2].toLowerCase() : 'general';
  const rawDescription = match ? match[3].trim() : subject;

  const bugsFixed = [];
  const newFeatures = [];

  // Extracción de bugs solucionados
  if (
    type === 'fix' ||
    fullText.includes('fix') ||
    fullText.includes('solucion') ||
    fullText.includes('correg')
  ) {
    if (fullText.includes('type') || fullText.includes('typescript')) {
      bugsFixed.push(
        'Corrección de tipado estricto en TypeScript y mitigación de fallos en suites de tests.',
      );
    }
    if (fullText.includes('timezone') || fullText.includes('utc') || fullText.includes('desfase')) {
      bugsFixed.push(
        'Resolución de desfase horario UTC (-1 día) en almacenamiento y visualización de fechas.',
      );
    }
    if (fullText.includes('cascade') || fullText.includes('cascada')) {
      bugsFixed.push('Bloqueo de eliminación en cascada accidental en base de datos.');
    }
    if (fullText.includes('dashboard') || fullText.includes('rpc')) {
      bugsFixed.push(
        'Manejo resiliente de respuestas RPC y resolución de errores de carga en Dashboard.',
      );
    }
    if (fullText.includes('bcv') || fullText.includes('tasa')) {
      bugsFixed.push('Ajuste de precisión de tasa cambiaria oficial BCV.');
    }
    if (bugsFixed.length === 0) {
      bugsFixed.push(`Corrección operativa en el módulo [${scope}]: ${rawDescription}`);
    }
  }

  // Extracción de nuevas características
  if (
    type === 'feat' ||
    fullText.includes('feat') ||
    fullText.includes('add') ||
    fullText.includes('enable') ||
    fullText.includes('incorpor') ||
    fullText.includes('nueva')
  ) {
    if (
      fullText.includes('forgot password') ||
      fullText.includes('recovery') ||
      fullText.includes('recuper')
    ) {
      newFeatures.push(
        'Flujo y enlace de recuperación de contraseñas integrado en el login de SaaS.',
      );
    }
    if (fullText.includes('skeleton') || fullText.includes('loading')) {
      newFeatures.push('Pantallas de carga Skeleton Screen para experiencia de usuario fluida.');
    }
    if (
      fullText.includes('location') ||
      fullText.includes('direccion') ||
      fullText.includes('selector')
    ) {
      newFeatures.push(
        'Selector geográfico estructurado de direcciones para congregaciones y miembros.',
      );
    }
    if (fullText.includes('organization') || fullText.includes('perfil')) {
      newFeatures.push('Módulo integral de Perfil y edición de datos de la Congregación.');
    }
    if (fullText.includes('slack') || fullText.includes('webhook') || fullText.includes('bot')) {
      newFeatures.push(
        'Capacidades interactivas de monitoreo y soporte para el bot @mateo en Slack.',
      );
    }
    if (newFeatures.length === 0) {
      newFeatures.push(`Nueva funcionalidad en [${scope}]: ${rawDescription}`);
    }
  }

  // Si no se clasificó directamente en ninguna lista
  if (bugsFixed.length === 0 && newFeatures.length === 0) {
    if (type === 'perf') {
      newFeatures.push(`Optimización de rendimiento en [${scope}]: ${rawDescription}`);
    } else if (type === 'docs') {
      newFeatures.push(`Actualización de documentación y protocolos: ${rawDescription}`);
    } else if (type === 'refactor') {
      bugsFixed.push(
        `Refactorización técnica y estabilización de código en [${scope}]: ${rawDescription}`,
      );
    } else {
      newFeatures.push(`Mejora técnica en [${scope}]: ${rawDescription}`);
    }
  }

  // Construir descripción en qué consiste
  const filesList =
    filesChanged.length > 0 ? filesChanged.slice(0, 4).join(', ') : 'módulos principales';
  const description =
    `Este commit se enfoca en el área de *${scope.toUpperCase()}*. ` +
    `Introduce cambios sobre ${filesList}. ` +
    `Su objetivo principal es: _"${rawDescription}"_.`;

  return {
    type,
    scope,
    rawDescription,
    description,
    bugsFixed,
    newFeatures,
  };
}

/**
 * Consulta Slack y correlaciona el commit con requerimientos de #qa-reviews
 */
async function correlateWithQaReviews(commit, _analysis) {
  let recentQaRequests = [];

  try {
    const res = await slackApiCall(`conversations.history?channel=${QA_REVIEWS_CHANNEL}&limit=10`);
    if (res.ok && res.messages) {
      // Extraer mensajes de usuarios que contengan solicitudes o feedback
      recentQaRequests = res.messages.filter((m) => m.text && !m.bot_id).map((m) => m.text);
    }
  } catch (err) {
    console.warn(
      '[Mateo Commits Reporter] No se pudo leer historial en vivo de #qa-reviews:',
      err.message,
    );
  }

  // Texto del commit exclusivamente para evitar auto-coincidencia
  const commitSearchText =
    `${commit.subject} ${commit.body} ${commit.filesChanged.join(' ')}`.toLowerCase();

  const matchedCategories = [];
  const solvedItems = [];

  for (const cat of QA_CHECKLIST_KNOWLEDGE) {
    const matchedKeyword = cat.keywords.find((k) => commitSearchText.includes(k.toLowerCase()));
    if (matchedKeyword) {
      matchedCategories.push(cat.categoria);
      // Cotejar ítems específicos de la categoría que tengan relación con el cambio
      for (const item of cat.items) {
        const itemWords = item
          .toLowerCase()
          .split(/[\s,()"/]+/)
          .filter((w) => w.length >= 4);
        const matchesWords = itemWords.some((w) => commitSearchText.includes(w));
        if (matchesWords && !solvedItems.includes(item)) {
          solvedItems.push(`[${cat.categoria}] ${item}`);
        }
      }
    }
  }

  // Si no se encontraron ítems específicos pero la categoría coincidió
  if (solvedItems.length === 0 && matchedCategories.length > 0) {
    solvedItems.push(
      `[${matchedCategories[0]}] Atención a componentes relacionados con ${matchedCategories[0]}`,
    );
  }

  // Cotejar también si coincide con mensajes directos recientes de #qa-reviews
  const solvedFromRecentMessages = [];
  if (recentQaRequests.length > 0) {
    for (const reqText of recentQaRequests) {
      const words = reqText
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 5);
      const matches = words.filter((w) => commitSearchText.includes(w));
      if (matches.length >= 2) {
        solvedFromRecentMessages.push(
          `Observación reciente en #qa-reviews: "${reqText.slice(0, 80)}..."`,
        );
      }
    }
  }

  if (solvedItems.length > 0 || solvedFromRecentMessages.length > 0) {
    const allItems = [...solvedItems, ...solvedFromRecentMessages];
    return {
      solvesQaRequirement: true,
      summary: `✅ *Soluciona / atiende requerimientos identificados en #qa-reviews:*`,
      items: allItems.slice(0, 4),
      categories: matchedCategories,
    };
  }

  return {
    solvesQaRequirement: false,
    summary:
      `ℹ️ *Relación con #qa-reviews:* Este commit atiende mantenimiento y funcionalidades técnicas complementarias ` +
      `de la plataforma SaaS, sin modificar ítems pendientes directos del checklist principal de #qa-reviews.`,
    items: [],
    categories: [],
  };
}

/**
 * Genera el mensaje formateado para Slack
 */
async function buildCommitReportMessage() {
  const commit = getLatestValidCommit();
  if (!commit || !commit.isValid) {
    return {
      text: '⚠️ *Reporte Diario de Commits — Agente Mateo*\nNo se pudo recuperar un commit válido reciente.',
    };
  }

  const analysis = analyzeCommit(commit);
  const qaCorrelation = await correlateWithQaReviews(commit, analysis);

  // Formato elegante y estructurado con Slack Block Kit
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🤖 Reporte Diario de Commits — Agente Mateo',
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📅 *Hora oficial:* 08:00 PM | 🌿 *Rama:* \`${commit.branch}\` | 👤 *Autor:* ${commit.author}`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `📌 *Último Commit Válido:*\n` +
          `• *Hash:* \`${commit.shortHash}\` (${commit.hash})\n` +
          `• *Fecha:* ${commit.date}\n` +
          `• *Mensaje:* *${commit.subject}*`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📖 *¿En qué consiste?*\n${analysis.description}`,
      },
    },
  ];

  // Sección de bugs solucionados
  if (analysis.bugsFixed.length > 0) {
    const bugsList = analysis.bugsFixed.map((b) => `• 🐞 ${b}`).join('\n');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🛠️ *Bugs Solucionados:*\n${bugsList}`,
      },
    });
  }

  // Sección de nuevas características
  if (analysis.newFeatures.length > 0) {
    const featList = analysis.newFeatures.map((f) => `• 🚀 ${f}`).join('\n');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✨ *Nuevas Características Implementadas:*\n${featList}`,
      },
    });
  }

  // Sección de QA Reviews
  let qaText = qaCorrelation.summary;
  if (qaCorrelation.solvesQaRequirement && qaCorrelation.items.length > 0) {
    qaText += '\n' + qaCorrelation.items.map((i) => `• 🎯 ${i}`).join('\n');
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `📋 *Validación de Requerimientos (#qa-reviews):*\n${qaText}`,
    },
  });

  // Footer / Archivos afectados
  const filesSample = commit.filesChanged.slice(0, 5).join(' · ');
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `📂 *Archivos involucrados:* ${filesSample || 'N/A'} | 🌐 Producción: https://mateo-wine.vercel.app`,
      },
    ],
  });

  const fallbackText =
    `🤖 *Reporte Diario de Commits — Agente Mateo (08:00 PM)*\n` +
    `• *Último commit:* \`${commit.shortHash}\` - *${commit.subject}*\n` +
    `• *Rama:* \`${commit.branch}\` | *Autor:* ${commit.author}\n` +
    `• *En qué consiste:* ${analysis.description}\n` +
    (analysis.bugsFixed.length > 0
      ? `• *Bugs solucionados:* ${analysis.bugsFixed.join('; ')}\n`
      : '') +
    (analysis.newFeatures.length > 0
      ? `• *Nuevas características:* ${analysis.newFeatures.join('; ')}\n`
      : '') +
    `• *Alineación con #qa-reviews:* ${qaCorrelation.summary}`;

  return {
    text: fallbackText,
    blocks,
  };
}

/**
 * Envía el reporte diario al canal de Slack (#commits por defecto)
 */
async function sendDailyCommitReport(targetChannel = DEFAULT_COMMITS_CHANNEL) {
  console.log(`[Mateo Commits Reporter] Preparando reporte para canal "${targetChannel}"...`);
  const report = await buildCommitReportMessage();

  try {
    const result = await slackApiCall('chat.postMessage', 'POST', {
      channel: targetChannel,
      text: report.text,
      blocks: report.blocks,
    });

    if (result.ok) {
      console.log(
        `[Mateo Commits Reporter] ✅ Reporte enviado exitosamente al canal "${targetChannel}" (ts: ${result.ts})`,
      );
      return { success: true, channel: targetChannel, ts: result.ts };
    } else {
      console.warn(
        `[Mateo Commits Reporter] ⚠️ Error devuelto por Slack en canal "${targetChannel}":`,
        result.error,
      );

      if (result.error === 'not_in_channel') {
        console.warn(
          `[Mateo Commits Reporter] El bot @mateo no ha sido invitado al canal "${targetChannel}". ` +
            `Para permitir la publicación automática, invita al bot en Slack escribiendo: /invite @mateo en el canal #${targetChannel}.`,
        );
      }

      return { success: false, error: result.error, channel: targetChannel };
    }
  } catch (error) {
    console.error(
      `[Mateo Commits Reporter] ❌ Excepción al enviar reporte a Slack:`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

// Ejecución directa por CLI si se llama desde la terminal
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetChannel = args[0] || DEFAULT_COMMITS_CHANNEL;

  console.log(
    `[Mateo Commits Reporter] Ejecutando generación de reporte manual para canal: ${targetChannel}`,
  );
  sendDailyCommitReport(targetChannel).then((res) => {
    console.log('[Mateo Commits Reporter] Resultado:', res);
  });
}

module.exports = {
  getLatestValidCommit,
  analyzeCommit,
  correlateWithQaReviews,
  buildCommitReportMessage,
  sendDailyCommitReport,
  QA_CHECKLIST_KNOWLEDGE,
};
