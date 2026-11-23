import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock('../../../server/authenticatedTenant', () => ({ authenticatedTenant: mocks.auth }));
import { POST } from './route';

const recordId = 'a6000000-0000-0000-0000-000000000002';
const transactionId = 'a8000000-0000-0000-0000-000000000002';
const request = (body: unknown) =>
  new Request('http://localhost/api/reconciliation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('reconciliation endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ supabase: { rpc: mocks.rpc }, ongId: 'tenant', userId: 'user' });
    mocks.rpc.mockResolvedValue({
      data: { donation: { id: recordId }, transaction: { id: transactionId } },
      error: null,
    });
  });

  it('rejects invalid requests before invoking the database', async () => {
    expect((await POST(request({ kind: 'donation', recordId: 'bad', transactionId }))).status).toBe(
      400,
    );
    expect((await POST(request({ kind: 'invalid', recordId, transactionId }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('calls the atomic function and returns its result', async () => {
    const result = await POST(request({ kind: 'donation', recordId, transactionId }));
    expect(result.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('reconcile_financial_record', {
      p_kind: 'donation',
      p_record_id: recordId,
      p_transaction_id: transactionId,
    });
    expect(await result.json()).toMatchObject({
      donation: { id: recordId },
      transaction: { id: transactionId },
    });
  });

  it('reports a conflict when the database rejects reconciliation', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'not available' } });
    expect((await POST(request({ kind: 'expense', recordId, transactionId }))).status).toBe(409);
  });
});
