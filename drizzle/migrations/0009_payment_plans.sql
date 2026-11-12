CREATE TABLE public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dni text NOT NULL DEFAULT '',
  cliente text,
  gestor text,
  estado text,
  cuotas text,
  monto numeric,
  proximo_vencimiento date,
  alerta text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plans TO authenticated;
GRANT ALL ON public.payment_plans TO service_role;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY pp_read ON public.payment_plans FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY pp_insert ON public.payment_plans FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY pp_update ON public.payment_plans FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY pp_delete ON public.payment_plans FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));
CREATE INDEX payment_plans_dni_idx ON public.payment_plans(dni);