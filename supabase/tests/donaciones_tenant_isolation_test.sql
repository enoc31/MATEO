-- Exercise the actual PostgreSQL policies as authenticated users from two tenants.
BEGIN;

SELECT plan(12);

INSERT INTO public.ongs (id, nombre) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Tenant A RLS test'),
  ('b1000000-0000-0000-0000-000000000001', 'Tenant B RLS test');

INSERT INTO auth.users (id, email) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'rls-a@example.test'),
  ('b2000000-0000-0000-0000-000000000001', 'rls-b@example.test');

UPDATE public.usuarios_perfiles SET ong_id = 'a1000000-0000-0000-0000-000000000001',
  rol = 'tesorero', aprobado = true WHERE id = 'a2000000-0000-0000-0000-000000000001';
UPDATE public.usuarios_perfiles SET ong_id = 'b1000000-0000-0000-0000-000000000001',
  rol = 'tesorero', aprobado = true WHERE id = 'b2000000-0000-0000-0000-000000000001';

INSERT INTO public.donaciones (id, ong_id, donante, monto, fecha) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'A', 10, '2026-01-01'),
  ('b3000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'B', 20, '2026-01-01');

INSERT INTO public.beneficiarios (id, ong_id, nombre, apellido)
VALUES ('b4000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'B', 'Member');
INSERT INTO public.cuentas_receptoras_iglesia (id, ong_id, tipo, banco, rif_cedula, titular)
VALUES ('b5000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'transferencia', 'Bank B', 'J-00000000-0', 'B');
INSERT INTO public.proyectos (id, ong_id, nombre)
VALUES ('b6000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Project B');
INSERT INTO public.categorias_gasto (id, ong_id, nombre)
VALUES ('b7000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Category B');
INSERT INTO public.partidas_gasto (id, ong_id, categoria_id, codigo, nombre)
VALUES ('b8000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-000000000001', 'TEST', 'Item B');
INSERT INTO public.proyectos_partidas (ong_id, proyecto_id, partida_id)
VALUES ('b1000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'b8000000-0000-0000-0000-000000000001');
INSERT INTO public.transacciones_bancarias (id, ong_id, fecha, descripcion, monto)
VALUES ('b9000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '2026-01-01', 'Bank B', 10);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000001', true);

SELECT is((SELECT count(*)::integer FROM public.donaciones WHERE id = 'a3000000-0000-0000-0000-000000000001'), 1, 'Tenant A can read its donation');
SELECT is((SELECT count(*)::integer FROM public.donaciones WHERE id = 'b3000000-0000-0000-0000-000000000001'), 0, 'Tenant A cannot read tenant B donation');
SELECT lives_ok($$INSERT INTO public.donaciones (ong_id, donante, monto, fecha) VALUES ('a1000000-0000-0000-0000-000000000001', 'A new', 1, '2026-01-01')$$, 'Tenant A can insert its donation');
SELECT throws_ok($$INSERT INTO public.donaciones (ong_id, donante, monto, fecha) VALUES ('b1000000-0000-0000-0000-000000000001', 'Cross tenant', 1, '2026-01-01')$$, '42501', NULL, 'Tenant A cannot insert a tenant B donation');
SELECT throws_ok($$INSERT INTO public.donaciones (ong_id, donante, monto, fecha, miembro_id) VALUES ('a1000000-0000-0000-0000-000000000001', 'Cross reference', 1, '2026-01-01', 'b4000000-0000-0000-0000-000000000001')$$, '23514', NULL, 'Tenant A cannot associate a member from tenant B');
SELECT throws_ok($$INSERT INTO public.donaciones (ong_id, donante, monto, fecha, cuenta_receptora_id) VALUES ('a1000000-0000-0000-0000-000000000001', 'Cross reference', 1, '2026-01-01', 'b5000000-0000-0000-0000-000000000001')$$, '23514', NULL, 'Tenant A cannot associate a bank account from tenant B');
SELECT throws_ok($$INSERT INTO public.donaciones (ong_id, donante, monto, fecha, proyecto_id) VALUES ('a1000000-0000-0000-0000-000000000001', 'Cross reference', 1, '2026-01-01', 'b6000000-0000-0000-0000-000000000001')$$, '23514', NULL, 'Tenant A cannot associate a project from tenant B');
SELECT throws_ok($$INSERT INTO public.donaciones (ong_id, donante, monto, fecha, transaccion_id) VALUES ('a1000000-0000-0000-0000-000000000001', 'Cross reference', 1, '2026-01-01', 'b9000000-0000-0000-0000-000000000001')$$, '23514', NULL, 'Tenant A cannot associate a transaction from tenant B');
SELECT throws_ok($$INSERT INTO public.donaciones (ong_id, donante, monto, fecha, created_by) VALUES ('a1000000-0000-0000-0000-000000000001', 'Cross reference', 1, '2026-01-01', 'b2000000-0000-0000-0000-000000000001')$$, '23514', NULL, 'Tenant A cannot attribute a donation to a user from tenant B');
SELECT throws_ok($$INSERT INTO public.comprobantes_gasto (ong_id, proyecto_id, partida_id, solicitante_id, monto, descripcion, fecha_gasto) VALUES ('a1000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'b8000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 1, 'Cross reference', '2026-01-01')$$, '23514', NULL, 'Tenant A cannot associate an expense with tenant B project and item');
WITH changed AS (
  UPDATE public.donaciones SET donante = 'Changed'
  WHERE id = 'b3000000-0000-0000-0000-000000000001' RETURNING id
)
SELECT is((SELECT count(*)::integer FROM changed), 0, 'Tenant A cannot update tenant B donation');

SELECT set_config('request.jwt.claim.sub', 'b2000000-0000-0000-0000-000000000001', true);
SELECT is((SELECT count(*)::integer FROM public.donaciones WHERE id = 'a3000000-0000-0000-0000-000000000001'), 0, 'Tenant B cannot read tenant A donation');

SELECT * FROM finish();
ROLLBACK;
