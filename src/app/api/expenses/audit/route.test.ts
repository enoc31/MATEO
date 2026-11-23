import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn(), result: vi.fn() }));
vi.mock('../../../../server/authenticatedTenant', () => ({ authenticatedTenant: mocks.auth }));
import { POST } from './route';

const expenseId = 'a7000000-0000-0000-0000-000000000002';
const request = (body: unknown) =>
  new Request('http://localhost/api/expenses/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('expense audit endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({
      userId: 'user-a',
      ongId: 'tenant-a',
      supabase: { from: () => ({ update: mocks.update }) },
    });
    mocks.update.mockReturnValue({
      eq: () => ({ eq: () => ({ select: () => ({ maybeSingle: mocks.result }) }) }),
    });
    mocks.result.mockResolvedValue({ data: { id: expenseId }, error: null });
  });

  it('requires an observation for rejection and prevents auditor impersonation', async () => {
    expect(
      (
        await POST(
          request({ expenseId, estado: 'rechazado', comentarios: ' ', auditorId: 'user-a' }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request({ expenseId, estado: 'aprobado', comentarios: null, auditorId: 'user-b' }),
        )
      ).status,
    ).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('attributes approval to the authenticated auditor', async () => {
    expect(
      (await POST(request({ expenseId, estado: 'aprobado', comentarios: '', auditorId: 'user-a' })))
        .status,
    ).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'aprobado', auditado_por: 'user-a' }),
    );
  });
});
