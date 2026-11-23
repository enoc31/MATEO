SET lock_timeout = '2s';
SET statement_timeout = '30s';

-- SECURITY INVOKER keeps the caller's RLS policies in force. A raised exception
-- rolls back both writes, and locking the pending transaction prevents reuse.
CREATE OR REPLACE FUNCTION public.reconcile_financial_record(
  p_kind text, p_record_id uuid, p_transaction_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ong uuid := public.get_user_ong_id();
  v_transaction public.transacciones_bancarias%ROWTYPE;
  v_donation public.donaciones%ROWTYPE;
  v_expense public.comprobantes_gasto%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_ong IS NULL OR p_kind IS NULL OR p_kind NOT IN ('donation', 'expense') THEN
    RAISE EXCEPTION 'Conciliación no autorizada o inválida' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_transaction FROM public.transacciones_bancarias
  WHERE id = p_transaction_id AND ong_id = v_ong AND estado = 'pendiente'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no disponible' USING ERRCODE = '23514';
  END IF;

  IF p_kind = 'donation' THEN
    UPDATE public.donaciones SET transaccion_id = p_transaction_id
    WHERE id = p_record_id AND ong_id = v_ong AND transaccion_id IS NULL
    RETURNING * INTO v_donation;
  ELSE
    UPDATE public.comprobantes_gasto SET transaccion_id = p_transaction_id, updated_at = now()
    WHERE id = p_record_id AND ong_id = v_ong AND transaccion_id IS NULL AND estado <> 'rechazado'
    RETURNING * INTO v_expense;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro no disponible' USING ERRCODE = '23514';
  END IF;

  UPDATE public.transacciones_bancarias SET estado = 'conciliado'
  WHERE id = p_transaction_id AND ong_id = v_ong AND estado = 'pendiente'
  RETURNING * INTO v_transaction;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no disponible' USING ERRCODE = '23514';
  END IF;

  IF p_kind = 'donation' THEN
    RETURN jsonb_build_object('donation', to_jsonb(v_donation), 'transaction', to_jsonb(v_transaction));
  END IF;
  RETURN jsonb_build_object('expense', to_jsonb(v_expense), 'transaction', to_jsonb(v_transaction));
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_financial_record(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_financial_record(text, uuid, uuid) TO authenticated;
RESET lock_timeout;
RESET statement_timeout;
