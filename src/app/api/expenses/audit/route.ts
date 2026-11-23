import { authenticatedTenant } from '../../../../server/authenticatedTenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const allowedRoles = new Set([
  'administrador',
  'admin_iglesia',
  'tesorero',
  'auditor_iglesia',
  'auditor',
  'director',
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticatedTenant(request, allowedRoles);
  if ('response' in auth) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (
    typeof input.expenseId !== 'string' ||
    !uuid.test(input.expenseId) ||
    (input.estado !== 'aprobado' && input.estado !== 'rechazado') ||
    (input.comentarios !== null && typeof input.comentarios !== 'string') ||
    (typeof input.comentarios === 'string' && input.comentarios.length > 4096) ||
    (input.estado === 'rechazado' &&
      (typeof input.comentarios !== 'string' || !input.comentarios.trim()))
  ) {
    return Response.json({ error: 'Datos de auditoría inválidos' }, { status: 400 });
  }
  if (input.auditorId !== auth.userId)
    return Response.json({ error: 'Acceso denegado' }, { status: 403 });
  const timestamp = new Date().toISOString();
  const { data, error } = await auth.supabase
    .from('comprobantes_gasto')
    .update({
      estado: input.estado,
      comentarios_auditoria: input.comentarios,
      auditado_por: auth.userId,
      auditado_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', input.expenseId)
    .eq('ong_id', auth.ongId)
    .select()
    .maybeSingle();
  if (error) return Response.json({ error: 'No se pudo actualizar la auditoría' }, { status: 500 });
  if (!data) return Response.json({ error: 'Gasto no disponible' }, { status: 404 });
  return Response.json(data);
}
