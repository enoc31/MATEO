import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { POST } from './route';
import { POST as postExpense } from '../../expenses/route';
import { POST as postReconciliation } from '../../reconciliation/route';
import { POST as postAudit } from '../../expenses/audit/route';

const url = process.env.SUPABASE_INTEGRATION_URL || '';
const anonKey = process.env.SUPABASE_INTEGRATION_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_INTEGRATION_SERVICE_KEY || '';
const enabled = process.env.RUN_SUPABASE_INTEGRATION === '1';
const tenantA = randomUUID();
const tenantB = randomUUID();
const memberB = randomUUID();
const accountB = randomUUID();
const projectA = randomUUID();
const projectB = randomUUID();
const categoryA = randomUUID();
const partidaA = randomUUID();
const transactionA = randomUUID();
const expenseTransactionA = randomUUID();
const transactionB = randomUUID();
const userIds: string[] = [];
const tokens: string[] = [];
let donationId = '';
let expenseId = '';

describe.skipIf(!enabled)('internal income with local Supabase RLS', () => {
  let admin: SupabaseClient;

  beforeAll(async () => {
    const host = new URL(url).hostname;
    if (!['localhost', '127.0.0.1', '::1'].includes(host) || !anonKey || !serviceKey) {
      throw new Error('Integration tests require an explicitly configured local Supabase instance');
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: orgError } = await admin.from('ongs').insert([
      { id: tenantA, nombre: 'Income test A' },
      { id: tenantB, nombre: 'Income test B' },
    ]);
    if (orgError) throw orgError;
    const { error: transactionError } = await admin.from('transacciones_bancarias').insert([
      { id: transactionA, ong_id: tenantA, fecha: '2026-01-01', descripcion: 'Income', monto: 10 },
      {
        id: expenseTransactionA,
        ong_id: tenantA,
        fecha: '2026-01-01',
        descripcion: 'Expense',
        monto: -10,
      },
      {
        id: transactionB,
        ong_id: tenantB,
        fecha: '2026-01-01',
        descripcion: 'Other tenant',
        monto: 10,
      },
    ]);
    if (transactionError) throw transactionError;
    const { error: projectError } = await admin.from('proyectos').insert([
      { id: projectA, ong_id: tenantA, nombre: 'Project A' },
      { id: projectB, ong_id: tenantB, nombre: 'Project B' },
    ]);
    if (projectError) throw projectError;
    const { error: categoryError } = await admin
      .from('categorias_gasto')
      .insert({ id: categoryA, ong_id: tenantA, nombre: 'Test category' });
    if (categoryError) throw categoryError;
    const { error: partidaError } = await admin.from('partidas_gasto').insert({
      id: partidaA,
      ong_id: tenantA,
      categoria_id: categoryA,
      codigo: 'TEST',
      nombre: 'Test partida',
    });
    if (partidaError) throw partidaError;
    const { error: linkError } = await admin
      .from('proyectos_partidas')
      .insert({ proyecto_id: projectA, partida_id: partidaA, ong_id: tenantA });
    if (linkError) throw linkError;
    const { error: memberError } = await admin.from('beneficiarios').insert({
      id: memberB,
      ong_id: tenantB,
      nombre: 'Test',
      apellido: 'Member',
    });
    if (memberError) throw memberError;
    const { error: accountError } = await admin.from('cuentas_receptoras_iglesia').insert({
      id: accountB,
      ong_id: tenantB,
      tipo: 'transferencia',
      banco: 'Test',
      rif_cedula: 'J-00000000-0',
      titular: 'Test',
    });
    if (accountError) throw accountError;
    for (const tenant of [tenantA, tenantB]) {
      const email = `${randomUUID()}@example.com`;
      const password = `${randomUUID()}aA1!`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw error || new Error('Failed to create test user');
      userIds.push(data.user.id);
      const { error: profileError } = await admin
        .from('usuarios_perfiles')
        .update({
          ong_id: tenant,
          rol: 'tesorero',
          aprobado: true,
        })
        .eq('id', data.user.id);
      if (profileError) throw profileError;
      const client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: session, error: loginError } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError || !session.session)
        throw loginError || new Error('Failed to sign in test user');
      tokens.push(session.session.access_token);
    }
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    await admin.from('comprobantes_gasto').delete().in('ong_id', [tenantA, tenantB]);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
    await admin.from('ongs').delete().in('id', [tenantA, tenantB]);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('writes under the authenticated tenant and denies cross-tenant access', async () => {
    const payload = {
      ong_id: tenantA,
      donante_nombre: 'Test',
      categoria_aporte: 'diezmo',
      moneda: 'VES',
      monto_original: 500,
      tasa_bcv: 50,
      monto_usd: 9999,
      medio_pago: 'efectivo',
      fecha: '2026-01-01',
    };
    const makeRequest = (token: string, body: unknown) =>
      new Request('http://localhost/api/incomes/internal', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect((await POST(makeRequest(tokens[0], { ...payload, ong_id: tenantB }))).status).toBe(403);
    expect((await POST(makeRequest(tokens[0], { ...payload, miembro_id: memberB }))).status).toBe(
      400,
    );
    expect(
      (await POST(makeRequest(tokens[0], { ...payload, cuenta_receptora_id: accountB }))).status,
    ).toBe(400);
    const result = await POST(makeRequest(tokens[0], payload));
    expect(result.status).toBe(201);
    const donation = await result.json();
    donationId = donation.id;
    expect(donation).toMatchObject({ ong_id: tenantA, monto: 10, monto_usd: 10, monto_ves: 500 });
    const other = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${tokens[1]}` } },
      auth: { persistSession: false },
    });
    const { data, error } = await other.from('donaciones').select('id').eq('id', donation.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('registers an expense only for the authenticated user and tenant', async () => {
    const payload = {
      proyecto_id: projectA,
      partida_id: partidaA,
      solicitante_id: userIds[0],
      monto: 12.5,
      descripcion: 'Test expense',
      fecha_gasto: '2026-01-01',
    };
    const makeRequest = (body: unknown) =>
      new Request('http://localhost/api/expenses', {
        method: 'POST',
        headers: { authorization: `Bearer ${tokens[0]}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect(
      (await postExpense(makeRequest({ ...payload, solicitante_id: userIds[1] }))).status,
    ).toBe(403);
    expect((await postExpense(makeRequest({ ...payload, proyecto_id: projectB }))).status).toBe(
      400,
    );
    const result = await postExpense(makeRequest(payload));
    expect(result.status).toBe(201);
    const expense = await result.json();
    expenseId = expense.id;
    expect(expense).toMatchObject({
      ong_id: tenantA,
      solicitante_id: userIds[0],
      estado: 'pendiente_revision',
    });
    const other = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${tokens[1]}` } },
      auth: { persistSession: false },
    });
    const { data, error } = await other
      .from('comprobantes_gasto')
      .select('id')
      .eq('id', expense.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('reconciles atomically and rejects cross-tenant or reused transactions', async () => {
    const { error: roleError } = await admin
      .from('usuarios_perfiles')
      .update({ rol: 'administrador' })
      .eq('id', userIds[0]);
    if (roleError) throw roleError;
    const makeRequest = (kind: string, recordId: string, transactionId: string) =>
      new Request('http://localhost/api/reconciliation', {
        method: 'POST',
        headers: { authorization: `Bearer ${tokens[0]}`, 'content-type': 'application/json' },
        body: JSON.stringify({ kind, recordId, transactionId }),
      });
    expect(
      (await postReconciliation(makeRequest('donation', donationId, transactionB))).status,
    ).toBe(409);
    const before = await admin
      .from('donaciones')
      .select('transaccion_id')
      .eq('id', donationId)
      .single();
    expect(before.data?.transaccion_id).toBeNull();
    const donation = await postReconciliation(makeRequest('donation', donationId, transactionA));
    expect(donation.status).toBe(200);
    expect(await donation.json()).toMatchObject({
      donation: { id: donationId, transaccion_id: transactionA },
      transaction: { id: transactionA, estado: 'conciliado' },
    });
    expect((await postReconciliation(makeRequest('expense', expenseId, transactionA))).status).toBe(
      409,
    );
    const beforeExpense = await admin
      .from('comprobantes_gasto')
      .select('transaccion_id')
      .eq('id', expenseId)
      .single();
    expect(beforeExpense.data?.transaccion_id).toBeNull();
    const expense = await postReconciliation(
      makeRequest('expense', expenseId, expenseTransactionA),
    );
    expect(expense.status).toBe(200);
    expect(await expense.json()).toMatchObject({
      expense: { id: expenseId, transaccion_id: expenseTransactionA },
      transaction: { id: expenseTransactionA, estado: 'conciliado' },
    });
  });

  it('audits only under the authenticated user and organization', async () => {
    const makeRequest = (token: string, auditorId: string, comentarios: string) =>
      new Request('http://localhost/api/expenses/audit', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ expenseId, estado: 'rechazado', comentarios, auditorId }),
      });
    expect((await postAudit(makeRequest(tokens[0], userIds[0], ' '))).status).toBe(400);
    expect((await postAudit(makeRequest(tokens[0], userIds[1], 'Missing receipt'))).status).toBe(
      403,
    );
    expect((await postAudit(makeRequest(tokens[1], userIds[1], 'Missing receipt'))).status).toBe(
      404,
    );
    const response = await postAudit(makeRequest(tokens[0], userIds[0], 'Missing receipt'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      estado: 'rechazado',
      auditado_por: userIds[0],
      ong_id: tenantA,
    });
  });
});
