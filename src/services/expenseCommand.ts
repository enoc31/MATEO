export interface ExpenseCommand {
  proyecto_id: string;
  partida_id: string;
  solicitud_id: string | null;
  solicitante_id: string;
  monto: number;
  descripcion: string;
  fecha_gasto: string;
  url_comprobante: string | null;
  url_pago: string | null;
}

export function parseExpense(input: unknown): ExpenseCommand {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Datos inválidos');
  const value = input as Record<string, unknown>;
  const required = (key: string): string => {
    const field = value[key];
    if (typeof field !== 'string' || !field.trim() || field.length > 4096)
      throw new Error('Datos inválidos');
    return field;
  };
  const optional = (key: string): string | null => {
    const field = value[key];
    if (field === null || field === undefined || field === '') return null;
    if (typeof field !== 'string' || field.length > 4096) throw new Error('Datos inválidos');
    return field;
  };
  const date = required('fecha_gasto');
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const amount = value.monto;
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  )
    throw new Error('Datos inválidos');
  return {
    proyecto_id: required('proyecto_id'),
    partida_id: required('partida_id'),
    solicitud_id: optional('solicitud_id'),
    solicitante_id: required('solicitante_id'),
    monto: amount,
    descripcion: required('descripcion'),
    fecha_gasto: date,
    url_comprobante: optional('url_comprobante'),
    url_pago: optional('url_pago'),
  };
}
