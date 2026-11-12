CREATE TYPE public.app_role AS ENUM ('admin','senior','gestor');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.can_edit(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','senior'))
$$;

CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY user_roles_admin_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_delete ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.padron_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia text NOT NULL CHECK (instancia IN ('N1','N2','N3')),
  dni text NOT NULL,
  titular text,
  saldo numeric,
  gestor text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX padron_entries_dni_idx ON public.padron_entries (dni);
CREATE INDEX padron_entries_inst_idx ON public.padron_entries (instancia);
GRANT SELECT, INSERT, DELETE ON public.padron_entries TO authenticated;
GRANT ALL ON public.padron_entries TO service_role;
ALTER TABLE public.padron_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY padron_read ON public.padron_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY padron_insert ON public.padron_entries FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY padron_delete ON public.padron_entries FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TABLE public.padron_uploads (
  instancia text PRIMARY KEY CHECK (instancia IN ('N1','N2','N3')),
  file_name text,
  rows_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.padron_uploads TO authenticated;
GRANT ALL ON public.padron_uploads TO service_role;
ALTER TABLE public.padron_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY pu_read ON public.padron_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY pu_insert ON public.padron_uploads FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY pu_update ON public.padron_uploads FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','urgente')),
  author_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ann_read ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY ann_insert ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY ann_delete ON public.announcements FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));