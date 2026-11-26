import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { forceSyncBCVRate, syncLiveBCVWithHistory } from '../utils/bcvSync';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      bulkUpsertTasasBCV: vi.fn(),
    },
  };
});

describe('bcvSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('syncLiveBCVWithHistory fetches live + history rates and upserts them via bulkUpsertTasasBCV', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          source: 'rates.dolarvzla.com',
          rates: [
            { date: '2026-11-26', value: 924.3534 },
            { date: '2026-11-25', value: 922.5637 },
          ],
          history: [{ date: '2026-11-24', value: 919.8227 }],
        }),
        { status: 200 },
      ),
    );

    vi.mocked(api.bulkUpsertTasasBCV).mockResolvedValue([
      { id: '1', fecha: '2026-11-26', tasa: 924.3534, fuente: 'bcv_api', created_at: '' },
      { id: '2', fecha: '2026-11-25', tasa: 922.5637, fuente: 'bcv_api', created_at: '' },
      { id: '3', fecha: '2026-11-24', tasa: 919.8227, fuente: 'bcv_api', created_at: '' },
    ]);

    const result = await syncLiveBCVWithHistory();
    expect(result).toEqual({
      latestRate: 924.3534,
      latestDate: '2026-11-26',
      syncedCount: 3,
      source: 'rates.dolarvzla.com',
    });
    expect(api.bulkUpsertTasasBCV).toHaveBeenCalledTimes(1);
  });

  it('forceSyncBCVRate returns the newly synced rate', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          source: 've.dolarapi.com',
          rates: [{ date: '2026-11-25', value: 922.5637 }],
        }),
        { status: 200 },
      ),
    );
    vi.mocked(api.bulkUpsertTasasBCV).mockResolvedValue([
      { id: '1', fecha: '2026-11-25', tasa: 922.5637, fuente: 'bcv_api', created_at: '' },
    ]);

    const rate = await forceSyncBCVRate();
    expect(rate).toBe(922.5637);
  });
});
