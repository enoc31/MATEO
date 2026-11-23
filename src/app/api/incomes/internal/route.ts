import { parseInternalIncome } from '../../../../services/internalIncomeCommand';
import { authenticatedTenant } from '../../../../server/authenticatedTenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedRoles = new Set(['administrador', 'admin_iglesia', 'tesorero', 'director']);

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticatedTenant(request, allowedRoles);
  if ('response' in auth) return auth.response;
  const { supabase, ongId } = auth;

  let input: unknown;
  let row: ReturnType<typeof parseInternalIncome>;
  try {
    input = await request.json();
    row = parseInternalIncome(input);
  } catch {
    return Response.json({ error: 'Datos de ingreso inválidos' }, { status: 400 });
  }
  const requestedOng = (input as Record<string, unknown>).ong_id;
  if (requestedOng && requestedOng !== ongId) {
    return Response.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  for (const [table, id] of [
    ['beneficiarios', row.miembro_id],
    ['cuentas_receptoras_iglesia', row.cuenta_receptora_id],
  ] as const) {
    if (!id) continue;
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .eq('ong_id', ongId)
      .maybeSingle();
    if (error || !data) return Response.json({ error: 'Referencia inválida' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('donaciones')
    .insert({ ...row, ong_id: ongId })
    .select()
    .single();
  if (error) {
    console.error('Error registrando ingreso interno:', error.message);
    return Response.json({ error: 'No se pudo registrar el ingreso' }, { status: 500 });
  }
  return Response.json(data, { status: 201 });
}
