ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS min_role text;

DROP POLICY IF EXISTS articles_read ON public.articles;
CREATE POLICY articles_read ON public.articles FOR SELECT TO authenticated
  USING (min_role IS NULL OR public.can_edit(auth.uid()));

CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY gp_read ON public.gallery_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY gp_insert ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY gp_delete ON public.gallery_photos FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.can_edit(auth.uid()));