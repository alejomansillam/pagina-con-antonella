CREATE TABLE public.editable_sections (
  key text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.editable_sections TO authenticated;
GRANT ALL ON public.editable_sections TO service_role;
ALTER TABLE public.editable_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY es_read ON public.editable_sections FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY es_insert ON public.editable_sections FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY es_update ON public.editable_sections FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE TABLE public.official_files (
  key text PRIMARY KEY,
  file_path text NOT NULL,
  file_name text NOT NULL,
  updated_by uuid,
  updated_by_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.official_files TO authenticated;
GRANT ALL ON public.official_files TO service_role;
ALTER TABLE public.official_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY of_read ON public.official_files FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY of_insert ON public.official_files FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY of_update ON public.official_files FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "of_obj_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'official-files' AND public.is_firm_member());
CREATE POLICY "of_obj_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'official-files' AND public.can_edit(auth.uid()));
CREATE POLICY "of_obj_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'official-files' AND public.can_edit(auth.uid()));
CREATE POLICY "of_obj_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'official-files' AND public.can_edit(auth.uid()));