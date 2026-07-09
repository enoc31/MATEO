import { describe, it, expect } from 'vitest';
import { formatDateForFrontEnd } from './formatters';
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
});
