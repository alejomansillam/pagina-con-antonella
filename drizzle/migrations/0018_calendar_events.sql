CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'reunion',
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Miembros leen eventos" ON public.calendar_events FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY "Editores crean eventos" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "Editores editan eventos" ON public.calendar_events FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "Editores borran eventos" ON public.calendar_events FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));