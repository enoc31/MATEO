import { authenticatedTenant } from '../../../server/authenticatedTenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const allowedRoles = new Set(['administrador', 'admin_iglesia', 'tesorero', 'auditor_iglesia']);
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
    (input.kind !== 'expense' && input.kind !== 'donation') ||
    typeof input.recordId !== 'string' ||
    !uuid.test(input.recordId) ||
    typeof input.transactionId !== 'string' ||
    !uuid.test(input.transactionId)
  ) {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  const { data, error } = await auth.supabase.rpc('reconcile_financial_record', {
    p_kind: input.kind,
    p_record_id: input.recordId,
    p_transaction_id: input.transactionId,
  });
  if (error)
    return Response.json(
      { error: 'No se pudo conciliar; comprueba que los registros sigan disponibles.' },
      { status: 409 },
    );
  return Response.json(data);
}
