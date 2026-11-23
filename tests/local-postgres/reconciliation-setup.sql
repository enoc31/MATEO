CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION public.get_user_ong_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;
CREATE TABLE public.transacciones_bancarias (id uuid PRIMARY KEY, ong_id uuid NOT NULL, estado text NOT NULL DEFAULT 'pendiente');
CREATE TABLE public.donaciones (id uuid PRIMARY KEY, ong_id uuid NOT NULL, transaccion_id uuid);
CREATE TABLE public.comprobantes_gasto (id uuid PRIMARY KEY, ong_id uuid NOT NULL, transaccion_id uuid, estado text NOT NULL DEFAULT 'pendiente', updated_at timestamptz DEFAULT now());
ALTER TABLE public.transacciones_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes_gasto ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_transactions ON public.transacciones_bancarias USING (ong_id = public.get_user_ong_id()) WITH CHECK (ong_id = public.get_user_ong_id());
CREATE POLICY tenant_donations ON public.donaciones USING (ong_id = public.get_user_ong_id()) WITH CHECK (ong_id = public.get_user_ong_id());
CREATE POLICY tenant_expenses ON public.comprobantes_gasto USING (ong_id = public.get_user_ong_id()) WITH CHECK (ong_id = public.get_user_ong_id());
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT SELECT, UPDATE ON public.transacciones_bancarias, public.donaciones, public.comprobantes_gasto TO authenticated;
