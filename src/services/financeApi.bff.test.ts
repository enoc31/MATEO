import { afterEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => vi.fn());
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: session } } }));
vi.mock('./api', () => ({ api: { createDonation: vi.fn() }, isSimulationMode: false }));

import { financeApi } from './financeApi';

const input = {
  donante_nombre: 'Maria',
  categoria_aporte: 'diezmo' as const,
  moneda: 'VES' as const,
  monto_original: 500,
  tasa_bcv: 50,
  monto_usd: 10,
  monto_ves: 500,
  medio_pago: 'efectivo' as const,
  fecha: '2026-01-01',
};

describe('internal income BFF client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('sends the user session to the Next.js endpoint', async () => {
    vi.stubEnv('VITE_APP_FRAMEWORK', 'next');
    session.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
      error: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'income-a' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await financeApi.registrarAporteInterno(input)).toEqual({ id: 'income-a' });
    expect(fetchMock).toHaveBeenCalledWith('/api/incomes/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer session-token' },
      body: JSON.stringify(input),
    });
  });

  it('fails without a session before making a request', async () => {
    vi.stubEnv('VITE_APP_FRAMEWORK', 'next');
    session.mockResolvedValue({ data: { session: null }, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(financeApi.registrarAporteInterno(input)).rejects.toThrow('Inicia sesión');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
