import { afterEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => vi.fn());
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: session } } }));

describe('expense BFF client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('sends a Next.js expense using the authenticated session', async () => {
    vi.stubEnv('VITE_APP_FRAMEWORK', 'next');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    session.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
      error: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'expense-a' }) });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('./api');
    const expense = {
      proyecto_id: 'project',
      partida_id: 'item',
      solicitante_id: 'user',
      monto: 25,
      descripcion: 'Receipt',
      fecha_gasto: '2026-01-01',
      url_comprobante: null,
    };
    expect(await api.createExpense(expense)).toEqual({ id: 'expense-a' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/expenses',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer session-token' },
      }),
    );
  });

  it('sends reconciliation to the atomic Next.js endpoint', async () => {
    vi.stubEnv('VITE_APP_FRAMEWORK', 'next');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    session.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
      error: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ donation: {}, transaction: {} }) });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('./api');
    await api.reconcileDonation('donation', 'transaction');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/reconciliation',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          kind: 'donation',
          recordId: 'donation',
          transactionId: 'transaction',
        }),
      }),
    );
  });

  it('sends expense audit to the authenticated Next.js endpoint', async () => {
    vi.stubEnv('VITE_APP_FRAMEWORK', 'next');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    session.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
      error: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'expense' }) });
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('./api');
    await api.updateExpenseStatus('expense', 'rechazado', 'Missing receipt', 'auditor');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/expenses/audit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          expenseId: 'expense',
          estado: 'rechazado',
          comentarios: 'Missing receipt',
          auditorId: 'auditor',
        }),
      }),
    );
  });
});
