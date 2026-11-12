CREATE OR REPLACE FUNCTION public.is_firm_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(COALESCE(auth.jwt()->>'email','')) LIKE '%@mansillayasoc.com.ar'
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid());
$$;

DROP POLICY IF EXISTS articles_read ON public.articles;
CREATE POLICY articles_read ON public.articles FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS categories_read ON public.categories;
CREATE POLICY categories_read ON public.categories FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS padron_read ON public.padron_entries;
CREATE POLICY padron_read ON public.padron_entries FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS pu_read ON public.padron_uploads;
CREATE POLICY pu_read ON public.padron_uploads FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS teams_read ON public.teams;
CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS cr_read ON public.chattigo_responses;
CREATE POLICY cr_read ON public.chattigo_responses FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS kudos_read ON public.kudos;
CREATE POLICY kudos_read ON public.kudos FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS ann_read ON public.announcements;
CREATE POLICY ann_read ON public.announcements FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_firm_member());
DROP POLICY IF EXISTS staff_directory_read ON public.staff_directory;
CREATE POLICY staff_directory_read ON public.staff_directory FOR SELECT TO authenticated USING (public.is_firm_member());
DROP POLICY IF EXISTS staff_directory_insert ON public.staff_directory;
CREATE POLICY staff_directory_insert ON public.staff_directory FOR INSERT TO authenticated WITH CHECK (public.is_firm_member());

DROP POLICY IF EXISTS ri_read ON public.role_invites;
CREATE POLICY ri_read ON public.role_invites FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS user_roles_read ON public.user_roles;
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));