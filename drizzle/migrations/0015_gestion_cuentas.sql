CREATE TABLE public.dash_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  rows_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'procesando',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.dash_accounts (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.dash_uploads(id) ON DELETE CASCADE,
  dni text NOT NULL, nombre text, cuenta text, padron text, responsable text, abogado text,
  deuda numeric, saldo_vencido numeric, cuotas integer, cuotas_pagas integer, cuotas_restantes integer,
  dias_sin_pago integer, ultimo_pago date, ultimo_llamado date, dias_ultimo_llamado integer,
  riesgo text, situacion text, proxima_gestion text, pendiente_imputacion boolean NOT NULL DEFAULT false,
  telefono text, email text, localidad text,
  refi_estado text, refi_fecha date, refi_vencimiento date, refi_monto_cuota numeric, refi_cuotas integer, refi_dias_sin_pago integer
);
CREATE INDEX ON public.dash_accounts(upload_id, responsable);
CREATE TABLE public.dash_pending (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.dash_uploads(id) ON DELETE CASCADE,
  dni text, nombre text, fecha date, monto numeric, responsable text, padron text, abogado text, estado text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dash_uploads, public.dash_accounts, public.dash_pending TO authenticated;
GRANT ALL ON public.dash_uploads, public.dash_accounts, public.dash_pending TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.dash_accounts_id_seq, public.dash_pending_id_seq TO authenticated;
ALTER TABLE public.dash_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dash_pending ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_gm_username() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT lower(trim(gm_username)) FROM public.profiles WHERE id = auth.uid() $$;

CREATE POLICY "uploads read" ON public.dash_uploads FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY "uploads write" ON public.dash_uploads FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "accounts read" ON public.dash_accounts FOR SELECT TO authenticated USING (public.can_edit(auth.uid()) OR lower(trim(responsable)) = public.my_gm_username());
CREATE POLICY "accounts write" ON public.dash_accounts FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "pending read" ON public.dash_pending FOR SELECT TO authenticated USING (public.can_edit(auth.uid()) OR lower(trim(responsable)) = public.my_gm_username());
CREATE POLICY "pending write" ON public.dash_pending FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));