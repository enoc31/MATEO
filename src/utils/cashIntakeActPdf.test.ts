import { describe, expect, it } from 'vitest';
import {
  buildCashActDescription,
  generateCashIntakeActPdf,
  parseCashActDescription,
  resolveSessionCashDonations,
  type CashActDonationItem,
} from './cashIntakeActPdf';
import { calculateConeSummary } from './currencyDenominations';

describe('cashIntakeActPdf', () => {
  it('builds and parses cash act description with responsible user, additional counters, session tag, and bill breakdown', () => {
    const coneSummary = calculateConeSummary('VES', { 500: 4, 200: 5 }, 50);
    const desc = buildCashActDescription({
      categoria: 'ofrenda',
      actividad: 'Culto Dominical',
      responsibleUser: 'Juan Tesorero',
      additionalCounters: ['Pedro Gómez', 'María Rodríguez'],
      sessionTag: 'ACTA-123',
      coneSummary,
    });

    const parsed = parseCashActDescription(desc, 'VES');
    expect(parsed.activity).toBe('Culto Dominical');
    expect(parsed.responsibleUser).toBe('Juan Tesorero');
    expect(parsed.additionalCounters).toEqual(['Pedro Gómez', 'María Rodríguez']);
    expect(parsed.sessionTag).toBe('ACTA-123');
    expect(parsed.denominationLines).toEqual([
      {
        currency: 'VES',
        count: 5,
        denominationLabel: 'Bs. 200,00',
        subtotalLabel: 'Bs. 1.000,00',
      },
      {
        currency: 'VES',
        count: 4,
        denominationLabel: 'Bs. 500,00',
        subtotalLabel: 'Bs. 2.000,00',
      },
    ]);
  });

  it('groups multi-currency cash donations belonging to the same counting session tag', () => {
    const vesSummary = calculateConeSummary('VES', { 500: 2 }, 50);
    const usdSummary = calculateConeSummary('USD', { 20: 3 }, 1);

    const d1: CashActDonationItem = {
      id: 'don-ves-1',
      donante: 'Conteo de Ofrenda',
      monto: 20,
      descripcion: buildCashActDescription({
        categoria: 'ofrenda',
        responsibleUser: 'Tesorero Central',
        additionalCounters: ['Hermano Luis'],
        sessionTag: 'LOTE-999',
        coneSummary: vesSummary,
      }),
      fecha: '2026-11-23',
      moneda: 'VES',
      medio_pago: 'efectivo',
      monto_original: 1000,
      tasa_bcv: 50,
      monto_usd: 20,
      monto_ves: 1000,
      categoria_aporte: 'ofrenda',
    };

    const d2: CashActDonationItem = {
      id: 'don-usd-2',
      donante: 'Conteo de Ofrenda',
      monto: 60,
      descripcion: buildCashActDescription({
        categoria: 'ofrenda',
        responsibleUser: 'Tesorero Central',
        additionalCounters: ['Hermano Luis'],
        sessionTag: 'LOTE-999',
        coneSummary: usdSummary,
      }),
      fecha: '2026-11-23',
      moneda: 'USD',
      medio_pago: 'efectivo',
      monto_original: 60,
      tasa_bcv: 50,
      monto_usd: 60,
      monto_ves: 3000,
      categoria_aporte: 'ofrenda',
    };

    const resolved = resolveSessionCashDonations(d1, [d1, d2]);
    expect(resolved).toHaveLength(2);

    const doc = generateCashIntakeActPdf({
      donation: d1,
      allDonations: [d1, d2],
      organizationName: 'Iglesia Central',
      loggedUserName: 'Tesorero Central',
    });
    expect(typeof doc.save).toBe('function');
  });
});
