import type { Donation } from './api';

type IncomeRow = Omit<Donation, 'id'>;

const categories = ['diezmo', 'ofrenda', 'primicia', 'misiones', 'pro_templo', 'otro'];
const methods = ['transferencia', 'pago_movil', 'efectivo'];

/** Parse untrusted income input and derive the recorded currency amounts. */
export function parseInternalIncome(input: unknown): IncomeRow {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Datos inválidos');
  const value = input as Record<string, unknown>;
  const optionalText = (key: string): string | null => {
    const field = value[key];
    if (field === undefined || field === null || field === '') return null;
    if (typeof field !== 'string' || field.length > 4096) throw new Error('Datos inválidos');
    return field;
  };
  const text = (key: string): string => {
    const field = value[key];
    if (typeof field !== 'string' || field.length > 4096) throw new Error('Datos inválidos');
    return field;
  };
  const amount = value.monto_original;
  const rate = value.tasa_bcv;
  const currency = value.moneda;
  const category = text('categoria_aporte');
  const method = text('medio_pago');
  const date = text('fecha');
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (rate !== null &&
      rate !== undefined &&
      (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0)) ||
    (currency !== 'USD' && currency !== 'VES') ||
    (currency === 'VES' && (typeof rate !== 'number' || rate <= 0)) ||
    !categories.includes(category) ||
    !methods.includes(method) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  )
    throw new Error('Datos inválidos');

  const usd = currency === 'USD' ? amount : Number((amount / (rate as number)).toFixed(2));
  const ves =
    currency === 'VES'
      ? amount
      : typeof rate === 'number'
        ? Number((amount * rate).toFixed(2))
        : null;
  if (!Number.isFinite(usd) || usd <= 0 || (ves !== null && !Number.isFinite(ves)))
    throw new Error('Datos inválidos');
  const activity = optionalText('actividad_o_responsable');
  const description =
    optionalText('descripcion')?.trim() ||
    `${category.toUpperCase()} — Registro Interno${activity ? ` (${activity})` : ''}`;

  return {
    proyecto_id: null,
    transaccion_id: null,
    donante: text('donante_nombre').trim() || 'Aporte Interno / Culto',
    monto: usd,
    descripcion: description,
    fecha: date,
    moneda: currency,
    medio_pago: method as Donation['medio_pago'],
    monto_original: amount,
    tasa_bcv: typeof rate === 'number' ? rate : null,
    monto_usd: usd,
    monto_ves: ves,
    categoria_aporte: category,
    referencia: optionalText('referencia'),
    banco_emisor: optionalText('banco_emisor'),
    telefono_emisor: optionalText('telefono_emisor'),
    comprobante_url: optionalText('comprobante_url'),
    miembro_id: optionalText('miembro_id'),
    cuenta_receptora_id: optionalText('cuenta_receptora_id'),
    actividad_o_responsable: activity,
  };
}
