import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseInternalIncome } from './internalIncomeCommand';

const valid = {
  donante_nombre: 'María',
  categoria_aporte: 'diezmo',
  moneda: 'VES',
  monto_original: 500,
  tasa_bcv: 50,
  medio_pago: 'efectivo',
  fecha: '2026-01-01',
};

describe('internal income command', () => {
  it('derives the amounts instead of trusting submitted totals', () => {
    const result = parseInternalIncome({ ...valid, monto_usd: 99999, monto_ves: 1 });
    expect(result).toMatchObject({ monto: 10, monto_usd: 10, monto_ves: 500 });
  });

  it('rejects invalid currency, amounts and rates', () => {
    for (const patch of [
      { monto_original: -1 },
      { monto_original: Infinity },
      { tasa_bcv: 0 },
      { moneda: 'EUR' },
      { categoria_aporte: 'invalid' },
      { medio_pago: 'invalid' },
      { fecha: 'invalid' },
      { fecha: '2026-02-30' },
      { donante_nombre: 42 },
      { tasa_bcv: NaN },
      { referencia: 123 },
    ])
      expect(() => parseInternalIncome({ ...valid, ...patch })).toThrow('Datos inválidos');
  });

  it('preserves optional information and supplies a default donor and description', () => {
    const result = parseInternalIncome({
      ...valid,
      donante_nombre: '  ',
      actividad_o_responsable: 'Culto',
      referencia: '123',
      miembro_id: 'member',
    });
    expect(result.donante).toBe('Aporte Interno / Culto');
    expect(result.descripcion).toBe('DIEZMO — Registro Interno (Culto)');
    expect(result.referencia).toBe('123');
    expect(result.miembro_id).toBe('member');
    expect(result.cuenta_receptora_id).toBeNull();
  });

  it('accepts each supported category and payment method', () => {
    for (const category of ['diezmo', 'ofrenda', 'primicia', 'misiones', 'pro_templo', 'otro']) {
      expect(parseInternalIncome({ ...valid, categoria_aporte: category }).categoria_aporte).toBe(
        category,
      );
    }
    for (const method of ['transferencia', 'pago_movil', 'efectivo']) {
      expect(parseInternalIncome({ ...valid, medio_pago: method }).medio_pago).toBe(method);
    }
  });

  it('converts VES amounts at the supplied rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 10000000 }),
        fc.integer({ min: 1, max: 100 }),
        (cents, rate) => {
          const amount = cents / 100;
          const result = parseInternalIncome({ ...valid, monto_original: amount, tasa_bcv: rate });
          expect(result.monto_ves).toBe(amount);
          expect(result.monto_usd).toBe(Number((amount / rate).toFixed(2)));
        },
      ),
    );
  });

  it('keeps USD amounts and derives VES at the supplied rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1000 }),
        (cents, rate) => {
          const amount = cents / 100;
          const result = parseInternalIncome({
            ...valid,
            moneda: 'USD',
            monto_original: amount,
            tasa_bcv: rate,
          });
          expect(result.monto_usd).toBe(amount);
          expect(result.monto_ves).toBe(Number((amount * rate).toFixed(2)));
        },
      ),
    );
  });
});
