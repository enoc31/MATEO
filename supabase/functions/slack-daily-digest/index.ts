// ============================================================
// slack-daily-digest/index.ts
// Supabase Edge Function: Envía resumen diario de pendientes
// de MATEO al canal de Slack configurado.
//
// Activación: pg_cron job diario, o HTTP POST manual desde
// el panel de administración de MATEO.
//
// Secrets requeridos (Supabase Dashboard → Settings → Secrets):
//   SLACK_BOT_TOKEN      → xoxb-... (Bot User OAuth Token)
//   SLACK_CHANNEL_ID     → C0XXXXXXX (ID del canal #mateo-pendientes)
//   SUPABASE_URL         → Automático (inyectado por Supabase)
//   SUPABASE_SERVICE_ROLE_KEY → Para queries privilegiadas sin RLS
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Constantes de entorno ─────────────────────────────────────
const DEFAULT_SLACK_BOT_TOKEN = 'xoxb-11707506536257-12408012454738-5ORkQ1Krf3dzTWB9ATmI756Z';
const DEFAULT_SLACK_CHANNEL_ID = 'C0CBJMA2NK1';

const ENV_SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const ENV_SLACK_CHANNEL_ID = Deno.env.get('SLACK_CHANNEL_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// ── CORS ──────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Tipos internos ────────────────────────────────────────────
interface PendingSummary {
  requisicionesPendientes: number;
  gastosSinComprobante: number;
  ingresosSinConciliar: number;
  usuariosPorAprobar: number;
  proyectosSinIngreso: number;
  presupuestosVencidos: number;
}

// ── Helpers de fecha ──────────────────────────────────────────
function getCaracasDateString(): string {
  return new Date().toLocaleDateString('es-VE', {
    timeZone: 'America/Caracas',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// ── Consultas a Supabase ──────────────────────────────────────
async function fetchPendingSummary(
  supabase: ReturnType<typeof createClient>,
): Promise<PendingSummary> {
  const [
    reqResult,
    gastosResult,
    ingresosResult,
    usuariosResult,
    proyectosResult,
    presupuestosResult,
  ] = await Promise.all([
    // 1. Requisiciones pendientes de aprobación
    supabase
      .from('solicitudes_gasto')
      .select('id', { count: 'exact', head: true })
      .in('estado', ['pendiente_aprobacion_1', 'pendiente_aprobacion_2']),

    // 2. Gastos sin comprobante adjunto
    supabase
      .from('comprobantes_gasto')
      .select('id', { count: 'exact', head: true })
      .is('url_comprobante', null)
      .in('estado', ['pendiente_soporte', 'pendiente_revision']),

    // 3. Transacciones bancarias sin conciliar (ingresos)
    supabase
      .from('transacciones_bancarias')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .gt('monto', 0), // Solo ingresos (monto positivo)

    // 4. Usuarios pendientes de aprobación de administrador
    supabase
      .from('usuarios_perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('aprobado', false),

    // 5. Proyectos activos sin ningún ingreso asociado
    supabase
      .from('proyectos')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)
      .is('donante_id', null), // Proyectos sin donante asignado

    // 6. Presupuestos próximos a vencer (≤ 30 días)
    supabase
      .from('proyectos')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)
      .lte('fecha_fin', getFutureDate(30))
      .gte('fecha_fin', new Date().toISOString().split('T')[0]),
  ]);

  return {
    requisicionesPendientes: reqResult.count ?? 0,
    gastosSinComprobante: gastosResult.count ?? 0,
    ingresosSinConciliar: ingresosResult.count ?? 0,
    usuariosPorAprobar: usuariosResult.count ?? 0,
    proyectosSinIngreso: proyectosResult.count ?? 0,
    presupuestosVencidos: presupuestosResult.count ?? 0,
  };
}

// ── Formatear mensaje Slack (Block Kit) ───────────────────────
function buildSlackMessage(summary: PendingSummary): object[] {
  const fechaHoy = getCaracasDateString();
  const appUrl = 'https://mateo-wine.vercel.app';

  const hasPendientes =
    summary.requisicionesPendientes > 0 ||
    summary.gastosSinComprobante > 0 ||
    summary.ingresosSinConciliar > 0 ||
    summary.usuariosPorAprobar > 0 ||
    summary.proyectosSinIngreso > 0 ||
    summary.presupuestosVencidos > 0;

  const blocks: object[] = [
    // ── Header ─────────────────────────────────────────────────
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📋 Resumen Diario MATEO',
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*${fechaHoy}* | Plataforma de Auditoría de Donaciones`,
        },
      ],
    },
    { type: 'divider' },
  ];

  if (!hasPendientes) {
    // ── Sin pendientes ─────────────────────────────────────────
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '✅ *¡Todo al día!* No hay pendientes en este momento. Buen trabajo al equipo. 🎉',
      },
    });
  } else {
    // ── Lista de pendientes ────────────────────────────────────
    const rows: string[] = [];

    if (summary.requisicionesPendientes > 0) {
      rows.push(`⏳ *Requisiciones pendientes de aprobación:* ${summary.requisicionesPendientes}`);
    }
    if (summary.gastosSinComprobante > 0) {
      rows.push(`📎 *Gastos sin comprobante adjunto:* ${summary.gastosSinComprobante}`);
    }
    if (summary.ingresosSinConciliar > 0) {
      rows.push(`🏦 *Ingresos bancarios sin conciliar:* ${summary.ingresosSinConciliar}`);
    }
    if (summary.usuariosPorAprobar > 0) {
      rows.push(`👤 *Usuarios pendientes de aprobación:* ${summary.usuariosPorAprobar}`);
    }
    if (summary.proyectosSinIngreso > 0) {
      rows.push(`📂 *Proyectos sin donante asignado:* ${summary.proyectosSinIngreso}`);
    }
    if (summary.presupuestosVencidos > 0) {
      rows.push(`📅 *Proyectos próximos a vencer (≤30 días):* ${summary.presupuestosVencidos}`);
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: rows.join('\n'),
      },
    });
  }

  // ── Divider + CTA ──────────────────────────────────────────
  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🚀 Ir a MATEO',
            emoji: true,
          },
          url: appUrl,
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📋 Ver Requisiciones',
            emoji: true,
          },
          url: `${appUrl}/app/requisitions`,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '💸 Ver Gastos',
            emoji: true,
          },
          url: `${appUrl}/app/field-entry`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_Mensaje automático generado por MATEO · ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}_`,
        },
      ],
    },
  );

  return blocks;
}

// ── Enviar mensaje a Slack ─────────────────────────────────────
async function postToSlack(blocks: object[], channelId: string, botToken: string): Promise<void> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel: channelId,
      blocks,
      text: '📋 Resumen Diario de Pendientes – MATEO', // Fallback para notificaciones
    }),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error ?? 'unknown_error'}`);
  }
}

// ── Handler principal ─────────────────────────────────────────
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Leer body si se enviaron parámetros opcionales
  let requestPayload: { channelId?: string; botToken?: string; customMessage?: string } = {};
  if (req.method === 'POST') {
    try {
      requestPayload = await req.json();
    } catch {
      requestPayload = {};
    }
  }

  const resolvedBotToken =
    requestPayload.botToken || ENV_SLACK_BOT_TOKEN || DEFAULT_SLACK_BOT_TOKEN;
  const resolvedChannelId =
    requestPayload.channelId || ENV_SLACK_CHANNEL_ID || DEFAULT_SLACK_CHANNEL_ID;

  if (!resolvedBotToken) {
    return new Response(
      JSON.stringify({ error: 'SLACK_BOT_TOKEN no configurado en Supabase Secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!resolvedChannelId) {
    return new Response(
      JSON.stringify({ error: 'SLACK_CHANNEL_ID no configurado en Supabase Secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Crear cliente Supabase con Service Role (bypass RLS para leer todos los tenants)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Consultar pendientes de la base de datos
    const summary = await fetchPendingSummary(supabase);

    // 2. Construir mensaje Slack Block Kit
    const blocks = buildSlackMessage(summary);

    // 3. Publicar en Slack
    await postToSlack(blocks, resolvedChannelId, resolvedBotToken);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        message: 'Resumen enviado a Slack exitosamente',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[slack-daily-digest] Error:', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
