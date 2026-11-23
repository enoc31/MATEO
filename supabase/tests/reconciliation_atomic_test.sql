BEGIN;
SELECT plan(11);

INSERT INTO public.ongs (id, nombre) VALUES
 ('a1000000-0000-0000-0000-000000000002', 'Reconciliation A'),
 ('b1000000-0000-0000-0000-000000000002', 'Reconciliation B');
INSERT INTO auth.users (id, email) VALUES
 ('a2000000-0000-0000-0000-000000000002', 'reconcile-a@example.test');
UPDATE public.usuarios_perfiles SET ong_id = 'a1000000-0000-0000-0000-000000000002',
  rol = 'administrador', aprobado = true WHERE id = 'a2000000-0000-0000-0000-000000000002';
INSERT INTO public.proyectos (id, ong_id, nombre)
VALUES ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Project');
INSERT INTO public.categorias_gasto (id, ong_id, nombre)
VALUES ('a4000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Category');
INSERT INTO public.partidas_gasto (id, ong_id, categoria_id, codigo, nombre)
VALUES ('a5000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000002', 'TEST', 'Item');
INSERT INTO public.proyectos_partidas (ong_id, proyecto_id, partida_id)
VALUES ('a1000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', 'a5000000-0000-0000-0000-000000000002');
INSERT INTO public.donaciones (id, ong_id, donante, monto, fecha)
VALUES ('a6000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Donor', 10, '2026-01-01');
INSERT INTO public.comprobantes_gasto (id, ong_id, proyecto_id, partida_id, solicitante_id, monto, descripcion, fecha_gasto)
VALUES ('a7000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', 'a5000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 10, 'Expense', '2026-01-01');
INSERT INTO public.transacciones_bancarias (id, ong_id, fecha, descripcion, monto) VALUES
 ('a8000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '2026-01-01', 'Donation tx', 10),
 ('a9000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '2026-01-01', 'Expense tx', -10),
 ('b8000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', '2026-01-01', 'Other tenant tx', 10);

CREATE FUNCTION pg_temp.fail_test_transaction_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.test_reconciliation_failure', true) = '1' AND NEW.estado = 'conciliado' THEN
    RAISE EXCEPTION 'Injected failure' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER test_reconciliation_failure BEFORE UPDATE ON public.transacciones_bancarias
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_test_transaction_update();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000002', true);
SELECT throws_ok($$SELECT public.reconcile_financial_record('donation', 'a6000000-0000-0000-0000-000000000002', 'b8000000-0000-0000-0000-000000000002')$$, '23514', NULL, 'Cross-tenant transaction is rejected');
SELECT is((SELECT transaccion_id FROM public.donaciones WHERE id = 'a6000000-0000-0000-0000-000000000002'), NULL::uuid, 'Rejected reconciliation leaves donation unchanged');
SELECT set_config('app.test_reconciliation_failure', '1', true);
SELECT throws_ok($$SELECT public.reconcile_financial_record('donation', 'a6000000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000002')$$, '23514', NULL, 'Failure of second write aborts reconciliation');
SELECT is((SELECT transaccion_id FROM public.donaciones WHERE id = 'a6000000-0000-0000-0000-000000000002'), NULL::uuid, 'Failed second write rolls back the donation');
SELECT is((SELECT estado::text FROM public.transacciones_bancarias WHERE id = 'a8000000-0000-0000-0000-000000000002'), 'pendiente', 'Failed second write leaves transaction pending');
SELECT set_config('app.test_reconciliation_failure', '0', true);
SELECT lives_ok($$SELECT public.reconcile_financial_record('donation', 'a6000000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000002')$$, 'Donation is reconciled');
SELECT is((SELECT transaccion_id FROM public.donaciones WHERE id = 'a6000000-0000-0000-0000-000000000002'), 'a8000000-0000-0000-0000-000000000002'::uuid, 'Donation references its transaction');
SELECT is((SELECT estado::text FROM public.transacciones_bancarias WHERE id = 'a8000000-0000-0000-0000-000000000002'), 'conciliado', 'Donation transaction is reconciled');
SELECT throws_ok($$SELECT public.reconcile_financial_record('donation', 'a6000000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000002')$$, '23514', NULL, 'Already reconciled transaction cannot be reused');
SELECT lives_ok($$SELECT public.reconcile_financial_record('expense', 'a7000000-0000-0000-0000-000000000002', 'a9000000-0000-0000-0000-000000000002')$$, 'Expense is reconciled');
SELECT is((SELECT estado::text FROM public.transacciones_bancarias WHERE id = 'a9000000-0000-0000-0000-000000000002'), 'conciliado', 'Expense transaction is reconciled');
SELECT * FROM finish();
ROLLBACK;
