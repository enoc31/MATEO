import { authenticatedTenant } from '../../../server/authenticatedTenant';
import { parseExpense } from '../../../services/expenseCommand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const allowedRoles = new Set([
  'coordinador',
  'administrador',
  'director',
  'lider_ministerio',
  'admin_iglesia',
  'tesorero',
  'pastor',
]);

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticatedTenant(request, allowedRoles);
  if ('response' in auth) return auth.response;
  const { supabase, ongId, userId } = auth;
  let input: unknown;
  let row: ReturnType<typeof parseExpense>;
  try {
    input = await request.json();
    row = parseExpense(input);
  } catch {
    return Response.json({ error: 'Datos de gasto inválidos' }, { status: 400 });
  }
  const requestedOng = (input as Record<string, unknown>).ong_id;
  if ((requestedOng && requestedOng !== ongId) || row.solicitante_id !== userId) {
    return Response.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  const { data: project, error: projectError } = await supabase
    .from('proyectos')
    .select('id')
    .eq('id', row.proyecto_id)
    .eq('ong_id', ongId)
    .maybeSingle();
  if (projectError || !project)
    return Response.json({ error: 'Proyecto inválido' }, { status: 400 });
  const { data: link, error: linkError } = await supabase
    .from('proyectos_partidas')
    .select('partida_id')
    .eq('proyecto_id', row.proyecto_id)
    .eq('partida_id', row.partida_id)
    .eq('ong_id', ongId)
    .maybeSingle();
  if (linkError || !link)
    return Response.json({ error: 'Partida inválida para el proyecto' }, { status: 400 });
  if (row.solicitud_id) {
    const { data: requisition, error } = await supabase
      .from('solicitudes_gasto')
      .select('proyecto_id, partida_id, solicitante_id, estado')
      .eq('id', row.solicitud_id)
      .eq('ong_id', ongId)
      .maybeSingle();
    if (
      error ||
      !requisition ||
      requisition.solicitante_id !== userId ||
      requisition.proyecto_id !== row.proyecto_id ||
      requisition.partida_id !== row.partida_id ||
      requisition.estado !== 'aprobada_ejecucion'
    ) {
      return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
    }
  }
  const { data, error } = await supabase
    .from('comprobantes_gasto')
    .insert({
      ...row,
      ong_id: ongId,
      transaccion_id: null,
      estado: 'pendiente_revision',
      comentarios_auditoria: null,
    })
    .select()
    .single();
  if (error) {
    console.error('Error registrando gasto:', error.message);
    return Response.json({ error: 'No se pudo registrar el gasto' }, { status: 500 });
  }
  return Response.json(data, { status: 201 });
}
