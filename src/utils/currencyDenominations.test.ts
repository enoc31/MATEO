import { describe, expect, it } from 'vitest';
import {
  CURRENCY_CONES,
  calculateConeSummary,
  calculateMultiCurrencySessionSummary,
  createDefaultMultiCurrencyRates,
  createEmptyMultiCurrencyCounts,
  formatCurrencyByCode,
} from './currencyDenominations';

describe('currencyDenominations', () => {
  it('defines the 4 expected monetary cones and their confirmed denominations', () => {
    expect(CURRENCY_CONES.VES.denominations.map((d) => d.value)).toEqual([
      5, 10, 20, 50, 100, 200, 500,
    ]);
    expect(CURRENCY_CONES.USD.denominations.map((d) => d.value)).toEqual([
      1, 2, 5, 10, 20, 50, 100,
    ]);
    expect(CURRENCY_CONES.EUR.denominations.map((d) => d.value)).toEqual([
      5, 10, 20, 50, 100, 200, 500,
    ]);
    expect(CURRENCY_CONES.COP.denominations.map((d) => d.value)).toEqual([
      2000, 5000, 10000, 20000, 50000, 100000,
    ]);
  });

  it('calculates a single cone summary and breakdown text accurately', () => {
    const summaryUsd = calculateConeSummary('USD', { 20: 3, 5: 2, 1: 4 }, 1);
    expect(summaryUsd.totalBills).toBe(9);
    expect(summaryUsd.totalAmountOriginal).toBe(74);
    expect(summaryUsd.equivalentUsd).toBe(74);
    expect(summaryUsd.breakdownText).toContain('Arqueo USD [9 billetes]');
    expect(summaryUsd.breakdownText).toContain('3x$20,00');

    const summaryVes = calculateConeSummary('VES', { 100: 5, 500: 1 }, 50);
    expect(summaryVes.totalBills).toBe(6);
    expect(summaryVes.totalAmountOriginal).toBe(1000);
    expect(summaryVes.equivalentUsd).toBe(20);

    const summaryEur = calculateConeSummary('EUR', { 50: 2 }, 1.1);
    expect(summaryEur.totalBills).toBe(2);
    expect(summaryEur.totalAmountOriginal).toBe(100);
    expect(summaryEur.equivalentUsd).toBe(110);

    const summaryCop = calculateConeSummary('COP', { 50000: 2, 20000: 1 }, 4000);
    expect(summaryCop.totalBills).toBe(3);
    expect(summaryCop.totalAmountOriginal).toBe(120000);
    expect(summaryCop.equivalentUsd).toBe(30);
  });

  it('aggregates a multi-currency counting session across VES, USD, EUR, and COP', () => {
    const counts = createEmptyMultiCurrencyCounts();
    counts.USD = { 10: 5 }; // $50
    counts.VES = { 200: 2 }; // Bs. 400 -> @ 40 Bs/$ = $10
    counts.EUR = { 20: 1 }; // €20 -> @ 1.05 $/€ = $21
    counts.COP = { 100000: 1 }; // COP 100.000 -> @ 4000 COP/$ = $25

    const rates = {
      ...createDefaultMultiCurrencyRates(40),
      EUR: 1.05,
      COP: 4000,
    };

    const session = calculateMultiCurrencySessionSummary(counts, rates);
    expect(session.activeCones.map((c) => c.code)).toEqual(['VES', 'USD', 'EUR', 'COP']);
    expect(session.totalBillsAllCones).toBe(9);
    expect(session.totalConsolidatedUsd).toBe(106);
  });

  it('formats currency amounts according to cone conventions', () => {
    expect(formatCurrencyByCode(20, 'USD')).toBe('$20,00');
    expect(formatCurrencyByCode(200, 'VES')).toBe('Bs. 200,00');
    expect(formatCurrencyByCode(50, 'EUR')).toBe('€ 50,00');
    expect(formatCurrencyByCode(50000, 'COP')).toBe('COP $50.000');
  });
});
