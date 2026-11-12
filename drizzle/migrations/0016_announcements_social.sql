ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
DROP POLICY IF EXISTS "announcements_update_editors" ON public.announcements;
CREATE POLICY "announcements_update_editors" ON public.announcements FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
GRANT UPDATE ON public.announcements TO authenticated;

CREATE TABLE public.announcement_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_reactions TO authenticated;
GRANT ALL ON public.announcement_reactions TO service_role;
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_read" ON public.announcement_reactions FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY "ar_insert" ON public.announcement_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_firm_member());
CREATE POLICY "ar_delete" ON public.announcement_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.announcement_comments TO authenticated;
GRANT ALL ON public.announcement_comments TO service_role;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ac_read" ON public.announcement_comments FOR SELECT TO authenticated USING (public.is_firm_member());
CREATE POLICY "ac_insert" ON public.announcement_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_firm_member());
CREATE POLICY "ac_delete" ON public.announcement_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.can_edit(auth.uid()));