import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('GET /api/tasas/live', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns current and previous rates from rates.dolarvzla.com', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          current: { date: '2026-11-26', usd: 924.3534 },
          previous: { date: '2026-11-25', usd: 922.5637 },
        }),
        { status: 200 },
      ),
    );

    const res = await GET(new Request('http://localhost/api/tasas/live'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      source: string;
      rates: { date: string; value: number }[];
    };
    expect(body.ok).toBe(true);
    expect(body.source).toBe('rates.dolarvzla.com');
    expect(body.rates).toEqual([
      { date: '2026-11-26', value: 924.3534 },
      { date: '2026-11-25', value: 922.5637 },
    ]);
  });

  it('falls back to ve.dolarapi.com when dolarvzla fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            promedio: 922.5637,
            fechaActualizacion: '2026-11-25T21:00:00-04:00',
          }),
          { status: 200 },
        ),
      );

    const res = await GET(new Request('http://localhost/api/tasas/live'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      source: string;
      rates: { date: string; value: number }[];
    };
    expect(body.ok).toBe(true);
    expect(body.source).toBe('ve.dolarapi.com');
    expect(body.rates).toEqual([{ date: '2026-11-25', value: 922.5637 }]);
  });
});
