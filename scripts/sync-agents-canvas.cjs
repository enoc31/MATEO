/**
 * Sync AI Agents Registry with Slack Channel Canvas
 * Canvas Tab: "Agentes y Funciones" (ID: F0CBW49L21K)
 * Channel: #agents (ID: C0CBV626CLB)
 */

const SLACK_BOT_TOKEN =
  process.env.SLACK_BOT_TOKEN || 'xoxb-11707506536257-12408012454738-5ORkQ1Krf3dzTWB9ATmI756Z';
const CANVAS_ID = process.env.SLACK_AGENTS_CANVAS_ID || 'F0CBW49L21K';

// Official Registry of AI Agents in the MATEO Project
const AGENTS_REGISTRY = [
  {
    name: 'Antigravity',
    emoji: '🏛️',
    role: 'Agente Orquestador & Arquitectura Principal',
    description:
      'Arquitecto de software, desarrollador full-stack y orquestador técnico principal del proyecto.',
    keyFunctions: [
      'Estructuración modular del proyecto con React 19, TypeScript, Vite y Supabase.',
      'Supervisión y cumplimiento estricto de las reglas arquitectónicas y tipado sin `any` (AGENTS.md).',
      'Mantenimiento y ejecución de la suite de pruebas unitarias e integrales en Vitest (126 pruebas aprobadas al 100%).',
      'Gestión de control de versiones y despliegue continuo en Vercel (`product/iglesias` y `main`).',
    ],
  },
  {
    name: 'UX & Performance Auditor (`ux-performance-agent`)',
    emoji: '⚡',
    role: 'Especialista en Optimización de Rendimiento, Carga y UX',
    description:
      'Auditor y optimizador de rendimiento web, tiempos de respuesta y experiencia de usuario.',
    keyFunctions: [
      'Definido y configurado en `.agents/agents/ux-performance-agent/agent.json`.',
      'Creación e integración de componentes Skeleton Screen (`SkeletonMembers`, `SkeletonTable`, `SkeletonCard`) para erradicar pantallas en blanco y spinners bloqueantes.',
      "Optimización de consultas a la base de datos: sustitución de `select('*')` por proyecciones de campos específicos y caché `stale-while-revalidate` en `sessionStorage`.",
      'Reducción drástica del tiempo de carga de la lista de miembros de ~5s a renderizado instantáneo (<100ms en caché).',
      'Implementación de división de código con `React.lazy` en rutas y carga diferida (`loading="lazy"`) en imágenes de alta resolución.',
    ],
  },
  {
    name: 'Notification Email Agent',
    emoji: '✉️',
    role: 'Agente de Mensajería Transaccional y Eventos',
    description:
      'Gestor automatizado de notificaciones y comunicaciones por correo a miembros, pastores y administradores.',
    keyFunctions: [
      'Automatización y orquestación de Supabase Edge Functions (`notify-registration`, `notify-approval`, `notify-invitation`).',
      'Despacho automático de notificaciones de bienvenida y registro cuando se postula un nuevo miembro.',
      'Envío de alertas en tiempo real sobre la aprobación de solicitudes benéficas y confirmación de donaciones.',
      'Generación y distribución de enlaces seguros de invitación para pastores, líderes y auditores.',
    ],
  },
  {
    name: 'Mateo (`@mateo`)',
    emoji: '🤖',
    role: 'Asistente Virtual Eclesiástico y Auditor en Tiempo Real',
    description:
      'Asistente inteligente en Slack y enlace operativo directo entre el equipo humano y la base de datos viva.',
    keyFunctions: [
      'Operación continua en segundo plano (`scripts/mateo-service.cjs`) y endpoint serverless en Vercel (`/api/slack-events`).',
      'Consultas analíticas en vivo a Supabase: métricas de congregaciones (5 activas), proyectos, miembros, inventarios y donaciones.',
      'Generación y envío diario del Reporte Matutino a las 8:00 AM (hora de Caracas).',
      'Publicación y actualización del panel visual interactivo *App Home Tab* en Slack.',
      'Asistencia técnica, pastoral y de auditoría en canales y mensajes directos.',
    ],
  },
];

function buildMarkdown() {
  let md = `# 🤖 Ecosistema de Agentes de IA en el Proyecto MATEO\n`;
  md += `*Documentación oficial de roles, arquitectura y responsabilidades técnicas.*  \n`;
  md += `*Última actualización sincronizada: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC*\n\n`;
  md += `---\n\n`;

  AGENTS_REGISTRY.forEach((agent, index) => {
    md += `## ${index + 1}. ${agent.emoji} ${agent.name}\n`;
    md += `* **Rol:** ${agent.role}\n`;
    md += `* **Descripción:** ${agent.description}\n`;
    md += `* **Funciones clave:**\n`;
    agent.keyFunctions.forEach((fn) => {
      md += `  * ${fn}\n`;
    });
    md += `\n---\n\n`;
  });

  return md;
}

async function syncCanvas() {
  console.log(
    `[Sync Agents Canvas] Sincronizando ${AGENTS_REGISTRY.length} agentes con el Canvas ${CANVAS_ID}...`,
  );

  const markdown = buildMarkdown();

  const res = await fetch('https://slack.com/api/canvases.edit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      canvas_id: CANVAS_ID,
      changes: [
        {
          operation: 'replace',
          document_content: {
            type: 'markdown',
            markdown: markdown,
          },
        },
      ],
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error('[Sync Agents Canvas] Error:', data);
    process.exit(1);
  }

  console.log('[Sync Agents Canvas] Sincronización exitosa con la pestaña "Agentes y Funciones"!');
}

if (require.main === module) {
  syncCanvas().catch((err) => {
    console.error('[Sync Agents Canvas] Error fatal:', err);
    process.exit(1);
  });
}

module.exports = {
  AGENTS_REGISTRY,
  syncCanvas,
  buildMarkdown,
};
