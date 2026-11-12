CREATE TABLE public.chattigo_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign text NOT NULL DEFAULT 'General',
  title text NOT NULL,
  body text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chattigo_responses TO authenticated;
GRANT ALL ON public.chattigo_responses TO service_role;
ALTER TABLE public.chattigo_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_read ON public.chattigo_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY cr_insert ON public.chattigo_responses FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY cr_update ON public.chattigo_responses FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY cr_delete ON public.chattigo_responses FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT 'neutral',
  leader text,
  description text NOT NULL DEFAULT '',
  members text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY teams_delete ON public.teams FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));