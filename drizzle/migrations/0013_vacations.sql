CREATE TABLE public.vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'aprobada',
  note text,
  priority text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacations TO authenticated;
GRANT ALL ON public.vacations TO service_role;
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
CREATE POLICY vac_read ON public.vacations FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY vac_ins ON public.vacations FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY vac_upd ON public.vacations FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()));
CREATE POLICY vac_del ON public.vacations FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));