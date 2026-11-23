import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  reference: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from(table: string) {
      if (table === 'usuarios_perfiles')
        return { select: () => ({ eq: () => ({ single: mocks.profile }) }) };
      if (table === 'donaciones') return { insert: mocks.insert };
      return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.reference }) }) }) };
    },
  }),
}));

import { POST } from './route';

const input = {
  ong_id: 'tenant-a',
  donante_nombre: 'Maria',
  categoria_aporte: 'diezmo',
  moneda: 'VES',
  monto_original: 500,
  tasa_bcv: 50,
  monto_usd: 9999,
  medio_pago: 'efectivo',
  fecha: '2026-01-01',
};
const request = (body: unknown, authorization = 'Bearer user-token') =>
  new Request('http://localhost/api/incomes/internal', {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('internal income endpoint', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
    mocks.profile.mockResolvedValue({
      data: { ong_id: 'tenant-a', rol: 'tesorero', aprobado: true },
      error: null,
    });
    mocks.reference.mockResolvedValue({ data: { id: 'ref-a' }, error: null });
    mocks.insert.mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: 'income-a' }, error: null }) }),
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('requires a valid bearer token', async () => {
    expect((await POST(request(input, ''))).status).toBe(401);
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid') });
    expect((await POST(request(input))).status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rejects unauthorized roles, other tenants and invisible references', async () => {
    mocks.profile.mockResolvedValueOnce({
      data: { ong_id: 'tenant-a', rol: 'auditor', aprobado: true },
      error: null,
    });
    expect((await POST(request(input))).status).toBe(403);
    expect((await POST(request({ ...input, ong_id: 'tenant-b' }))).status).toBe(403);
    mocks.reference.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(request({ ...input, miembro_id: 'other-tenant' }))).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('derives amounts and inserts with the authenticated tenant', async () => {
    const response = await POST(request(input));
    expect(response.status).toBe(201);
    expect(mocks.getUser).toHaveBeenCalledWith('user-token');
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ ong_id: 'tenant-a', monto: 10, monto_usd: 10, monto_ves: 500 }),
    );
  });
});
