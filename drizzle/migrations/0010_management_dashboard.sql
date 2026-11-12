CREATE TABLE public.management_dashboard (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_name text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.management_dashboard TO authenticated;
GRANT ALL ON public.management_dashboard TO service_role;
ALTER TABLE public.management_dashboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY md_read ON public.management_dashboard FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY md_insert ON public.management_dashboard FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY md_update ON public.management_dashboard FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));