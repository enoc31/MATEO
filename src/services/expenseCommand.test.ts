import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseExpense } from './expenseCommand';

const input = {
  proyecto_id: 'project',
  partida_id: 'item',
  solicitante_id: 'user',
  monto: 10,
  descripcion: 'Receipt',
  fecha_gasto: '2026-01-01',
};

describe('expense command', () => {
  it('rejects invalid amounts, dates and identifiers', () => {
    for (const patch of [
      { monto: 0 },
      { monto: -1 },
      { monto: Infinity },
      { monto: '10' },
      { fecha_gasto: '2026-02-30' },
      { proyecto_id: '' },
      { partida_id: null },
      { solicitante_id: '' },
      { descripcion: ' ' },
      { url_pago: 42 },
      { solicitud_id: 'x'.repeat(4097) },
    ])
      expect(() => parseExpense({ ...input, ...patch })).toThrow('Datos inválidos');
    expect(() => parseExpense(null)).toThrow('Datos inválidos');
    expect(() => parseExpense([])).toThrow('Datos inválidos');
  });

  it('preserves optional expense references', () => {
    const result = parseExpense({
      ...input,
      solicitud_id: 'req',
      url_comprobante: 'receipt',
      url_pago: 'payment',
    });
    expect(result).toMatchObject({
      solicitud_id: 'req',
      url_comprobante: 'receipt',
      url_pago: 'payment',
    });
    expect(parseExpense(input)).toMatchObject({
      solicitud_id: null,
      url_comprobante: null,
      url_pago: null,
    });
  });

  it('preserves any positive amount in cents', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000_000 }), (cents) => {
        expect(parseExpense({ ...input, monto: cents / 100 }).monto).toBe(cents / 100);
      }),
    );
  });
});
