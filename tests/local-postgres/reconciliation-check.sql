INSERT INTO public.donaciones (id, ong_id) VALUES ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000');
INSERT INTO public.transacciones_bancarias (id, ong_id) VALUES
 ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000'),
 ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000000');
INSERT INTO public.comprobantes_gasto (id, ong_id) VALUES ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000');
INSERT INTO public.transacciones_bancarias (id, ong_id) VALUES ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000000');
CREATE FUNCTION public.fail_transaction_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.fail_update', true) = 'yes' THEN RAISE EXCEPTION 'injected failure'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER inject_failure BEFORE UPDATE ON public.transacciones_bancarias FOR EACH ROW EXECUTE FUNCTION public.fail_transaction_update();
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
SELECT set_config('app.tenant_id', 'a0000000-0000-0000-0000-000000000000', false);
DO $$ BEGIN
  BEGIN
    PERFORM public.reconcile_financial_record('donation', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'cross-tenant reconciliation succeeded';
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM set_config('app.fail_update', 'yes', false);
  BEGIN
    PERFORM public.reconcile_financial_record('donation', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'expected injected failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'injected failure' THEN RAISE; END IF;
  END;
  IF (SELECT transaccion_id IS NOT NULL FROM public.donaciones WHERE id = 'a0000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'failed transaction did not roll back';
  END IF;
  PERFORM set_config('app.fail_update', 'no', false);
  PERFORM public.reconcile_financial_record('donation', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
  IF (SELECT estado FROM public.transacciones_bancarias WHERE id = 'a0000000-0000-0000-0000-000000000002') <> 'conciliado' THEN
    RAISE EXCEPTION 'transaction was not reconciled';
  END IF;
  PERFORM public.reconcile_financial_record('expense', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005');
  IF (SELECT transaccion_id FROM public.comprobantes_gasto WHERE id = 'a0000000-0000-0000-0000-000000000004') <> 'a0000000-0000-0000-0000-000000000005'::uuid THEN
    RAISE EXCEPTION 'expense was not reconciled';
  END IF;
  BEGIN
    PERFORM public.reconcile_financial_record('donation', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'duplicate reconciliation succeeded';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
