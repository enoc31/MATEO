import { describe, it, expect } from 'vitest';
import { formatAmount, formatDateForFrontEnd, formatUsd, formatVes } from './formatters';
import fc from 'fast-check';

describe('formatters', () => {
  it('should format YYYY-MM-DD correctly', () => {
    expect(formatDateForFrontEnd('2026-07-09')).toBe('09/07/2026');
  });

  it('property-based test: should always return a string', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const result = formatDateForFrontEnd(str);
        return typeof result === 'string';
      }),
    );
  });

  it('formats amounts with dot thousands and comma decimals', () => {
    expect(formatAmount(0)).toBe('0,00');
    expect(formatAmount(1234.5)).toBe('1.234,50');
    expect(formatAmount(1250000.75)).toBe('1.250.000,75');
    expect(formatAmount(-4500.1)).toBe('-4.500,10');
    expect(formatAmount(null)).toBe('0,00');
    expect(formatUsd(1234.56)).toBe('$1.234,56');
    expect(formatVes(98765.4)).toBe('Bs. 98.765,40');
  });
});
