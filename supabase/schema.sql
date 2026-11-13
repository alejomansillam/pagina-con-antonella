-- Estructura del Portal del Estudio (sin datos). Generado desde full_schema.sql

-- Esquema completo reconstruido a partir del historial de migraciones, en orden.
-- Ejecutar en un proyecto vacío (SQL Editor).

-- ===== supabase/migrations/20260916184450_1b1a0c96-a227-4b73-8959-a659b1e9b96c.sql =====

-- shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  department TEXT,
  role_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  objectives TEXT[] NOT NULL DEFAULT '{}',
  accent TEXT NOT NULL DEFAULT 'amber',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO authenticated;

GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_read" ON public.categories FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- articles
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  reading_minutes INT NOT NULL DEFAULT 3,
  is_required BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.articles TO authenticated;

GRANT ALL ON public.articles TO service_role;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles_read" ON public.articles FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX articles_category_idx ON public.articles(category_id, position);

-- bookmarks
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;

GRANT ALL ON public.bookmarks TO service_role;

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reading progress
CREATE TABLE public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;

GRANT ALL ON public.reading_progress TO service_role;

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reading_progress_own" ON public.reading_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== supabase/migrations/20260916184505_05dd90b9-96e3-48dc-9bf0-55beca310776.sql =====
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===== supabase/migrations/20260916184808_d708c066-e1cc-4ca6-b1b8-7afe35143301.sql =====

ALTER TABLE public.articles
  ADD COLUMN external_url TEXT,
  ADD COLUMN external_label TEXT,
  ADD COLUMN is_tool BOOLEAN NOT NULL DEFAULT false;

-- ===== supabase/migrations/20260917174809_40bea4d4-7b4b-4837-9299-09a0ed68ecd9.sql =====

ALTER TABLE public.articles
  ADD COLUMN resources JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ===== drizzle/migrations/0000_staff_directory_and_profile_contact_fields.sql =====
-- 1. Extend profiles with operational contact data
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS gm_username text,
  ADD COLUMN IF NOT EXISTS internal_email text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS microsip_ext text,
  ADD COLUMN IF NOT EXISTS birth_day integer,
  ADD COLUMN IF NOT EXISTS birth_month integer;

-- Let the whole firm read the staff list (internal portal directory)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 2. Institutional contact directory
CREATE TABLE IF NOT EXISTS public.staff_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  nickname text,
  gm_username text,
  microsip_ext text,
  whatsapp text,
  whatsapp_alt text,
  internal_email text,
  role_title text,
  team text,
  kind text NOT NULL DEFAULT 'gestor',
  birth_day integer,
  birth_month integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_directory_full_name_key ON public.staff_directory (full_name);

GRANT SELECT, INSERT, UPDATE ON public.staff_directory TO authenticated;

GRANT ALL ON public.staff_directory TO service_role;

ALTER TABLE public.staff_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_directory_read ON public.staff_directory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY staff_directory_insert ON public.staff_directory
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY staff_directory_update ON public.staff_directory
  FOR UPDATE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE TRIGGER update_staff_directory_updated_at
  BEFORE UPDATE ON public.staff_directory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== drizzle/migrations/0001_roles_padrones_avisos.sql =====
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

-- ===== drizzle/migrations/0002_community_roles_invites.sql =====
-- 1. Pre-asignación de roles por email corporativo
CREATE TABLE IF NOT EXISTS public.role_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, role)
);

GRANT SELECT ON public.role_invites TO authenticated;

GRANT ALL ON public.role_invites TO service_role;

ALTER TABLE public.role_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY ri_read ON public.role_invites FOR SELECT TO authenticated USING (true);

CREATE POLICY ri_insert ON public.role_invites FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY ri_delete ON public.role_invites FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Al registrarse, aplica los roles pre-asignados a su email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, ri.role
  FROM public.role_invites ri
  WHERE lower(ri.email) = lower(NEW.email)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $function$;

-- 2. Reconocimientos entre compañeros (Kudos)
CREATE TABLE IF NOT EXISTS public.kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_name text NOT NULL DEFAULT '',
  to_name text NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.kudos TO authenticated;

GRANT ALL ON public.kudos TO service_role;

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY kudos_read ON public.kudos FOR SELECT TO authenticated USING (true);

CREATE POLICY kudos_insert ON public.kudos FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY kudos_delete ON public.kudos FOR DELETE TO authenticated USING (auth.uid() = from_user_id OR public.can_edit(auth.uid()));

-- 3. Buzón digital de sugerencias
CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  topic text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'nueva',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.suggestions TO authenticated;

GRANT ALL ON public.suggestions TO service_role;

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sug_insert ON public.suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY sug_read_own ON public.suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.can_edit(auth.uid()));

CREATE POLICY sug_update ON public.suggestions FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- ===== drizzle/migrations/0003_restrict_signup_to_firm_domain.sql =====
-- Solo correos corporativos del estudio pueden crear cuenta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.email, '')) NOT LIKE '%@mansillayasoc.com.ar' THEN
    RAISE EXCEPTION 'Solo se permite el registro con el correo del estudio (@mansillayasoc.com.ar)';
  END IF;

  INSERT INTO public.profiles (id, full_name, internal_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, ri.role
  FROM public.role_invites ri
  WHERE lower(ri.email) = lower(NEW.email)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Todos los ingresos arrancan con acceso de gestor
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'gestor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $function$;

-- ===== drizzle/migrations/0004_chattigo_responses_teams.sql =====
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

-- ===== drizzle/migrations/0005_restrict_reads_to_firm_members.sql =====
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

-- ===== drizzle/migrations/0006_team_goals_bank_accounts.sql =====
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS monthly_goal numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS recovered numeric NOT NULL DEFAULT 0;

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank text NOT NULL,
  holder text NOT NULL DEFAULT '',
  cbu text,
  alias text,
  note text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;

GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ba_read ON public.bank_accounts FOR SELECT TO authenticated USING (public.is_firm_member());

CREATE POLICY ba_insert ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY ba_update ON public.bank_accounts FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY ba_delete ON public.bank_accounts FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- ===== drizzle/migrations/0007_articles_min_role_gallery_photos.sql =====
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

-- ===== drizzle/migrations/0008_gallery_storage_policies.sql =====
CREATE POLICY gallery_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'gallery');

CREATE POLICY gallery_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery');

CREATE POLICY gallery_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery');

-- ===== drizzle/migrations/0009_payment_plans.sql =====
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

-- ===== drizzle/migrations/0010_management_dashboard.sql =====
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

-- ===== drizzle/migrations/0011_editable_sections_official_files.sql =====
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

-- ===== drizzle/migrations/0013_vacations.sql =====
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

-- ===== drizzle/migrations/0014_vacations_team.sql =====
ALTER TABLE public.vacations ADD COLUMN team text, ADD COLUMN days integer, ADD COLUMN source text NOT NULL DEFAULT 'manual';

-- ===== drizzle/migrations/0015_gestion_cuentas.sql =====
CREATE TABLE public.dash_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  rows_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'procesando',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.dash_accounts (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.dash_uploads(id) ON DELETE CASCADE,
  dni text NOT NULL, nombre text, cuenta text, padron text, responsable text, abogado text,
  deuda numeric, saldo_vencido numeric, cuotas integer, cuotas_pagas integer, cuotas_restantes integer,
  dias_sin_pago integer, ultimo_pago date, ultimo_llamado date, dias_ultimo_llamado integer,
  riesgo text, situacion text, proxima_gestion text, pendiente_imputacion boolean NOT NULL DEFAULT false,
  telefono text, email text, localidad text,
  refi_estado text, refi_fecha date, refi_vencimiento date, refi_monto_cuota numeric, refi_cuotas integer, refi_dias_sin_pago integer
);

CREATE INDEX ON public.dash_accounts(upload_id, responsable);

CREATE TABLE public.dash_pending (
  id bigserial PRIMARY KEY,
  upload_id uuid NOT NULL REFERENCES public.dash_uploads(id) ON DELETE CASCADE,
  dni text, nombre text, fecha date, monto numeric, responsable text, padron text, abogado text, estado text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dash_uploads, public.dash_accounts, public.dash_pending TO authenticated;

GRANT ALL ON public.dash_uploads, public.dash_accounts, public.dash_pending TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.dash_accounts_id_seq, public.dash_pending_id_seq TO authenticated;

ALTER TABLE public.dash_uploads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.dash_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.dash_pending ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_gm_username() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT lower(trim(gm_username)) FROM public.profiles WHERE id = auth.uid() $$;

CREATE POLICY "uploads read" ON public.dash_uploads FOR SELECT TO authenticated USING (public.is_firm_member());

CREATE POLICY "uploads write" ON public.dash_uploads FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "accounts read" ON public.dash_accounts FOR SELECT TO authenticated USING (public.can_edit(auth.uid()) OR lower(trim(responsable)) = public.my_gm_username());

CREATE POLICY "accounts write" ON public.dash_accounts FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "pending read" ON public.dash_pending FOR SELECT TO authenticated USING (public.can_edit(auth.uid()) OR lower(trim(responsable)) = public.my_gm_username());

CREATE POLICY "pending write" ON public.dash_pending FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- ===== drizzle/migrations/0016_announcements_social.sql =====
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

-- ===== drizzle/migrations/0017_piso_deuda.sql =====
CREATE TABLE public.piso_factors (abogado text NOT NULL, riesgo text NOT NULL, factor numeric NOT NULL, PRIMARY KEY (abogado, riesgo));

CREATE TABLE public.piso_config (id integer PRIMARY KEY DEFAULT 1, coeficiente numeric NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piso_factors TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piso_config TO authenticated;

GRANT ALL ON public.piso_factors TO service_role;

GRANT ALL ON public.piso_config TO service_role;

ALTER TABLE public.piso_factors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.piso_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY piso_factors_read ON public.piso_factors FOR SELECT TO authenticated USING (public.is_firm_member());

CREATE POLICY piso_factors_write ON public.piso_factors FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY piso_config_read ON public.piso_config FOR SELECT TO authenticated USING (public.is_firm_member());

CREATE POLICY piso_config_write ON public.piso_config FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- ===== drizzle/migrations/0018_calendar_events.sql =====
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

-- ===== drizzle/migrations/0020_calendar_events_extend.sql =====
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS announcement_id uuid REFERENCES public.announcements(id) ON DELETE SET NULL;

ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_end_after_start CHECK (end_date IS NULL OR end_date >= event_date);

-- ===== drizzle/migrations/0021_internal_team_chat.sql =====
CREATE TABLE public.internal_chats (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('direct','group')),
 name text,
 direct_key text UNIQUE,
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((kind='group' AND length(trim(name)) BETWEEN 1 AND 100 AND direct_key IS NULL) OR (kind='direct' AND name IS NULL AND direct_key IS NOT NULL))
);

GRANT SELECT ON public.internal_chats TO authenticated;

GRANT ALL ON public.internal_chats TO service_role;

ALTER TABLE public.internal_chats ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.internal_chat_members (
 chat_id uuid NOT NULL REFERENCES public.internal_chats(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (chat_id,user_id)
);

GRANT SELECT ON public.internal_chat_members TO authenticated;

GRANT ALL ON public.internal_chat_members TO service_role;

ALTER TABLE public.internal_chat_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX internal_chat_members_user ON public.internal_chat_members(user_id,chat_id);

CREATE TABLE public.internal_chat_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 chat_id uuid NOT NULL REFERENCES public.internal_chats(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES public.profiles(id),
 body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.internal_chat_messages TO authenticated;

GRANT ALL ON public.internal_chat_messages TO service_role;

ALTER TABLE public.internal_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX internal_chat_messages_history ON public.internal_chat_messages(chat_id,created_at,id);

CREATE FUNCTION public.internal_chat_is_member(_chat_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_firm_member() AND EXISTS(SELECT 1 FROM public.internal_chat_members WHERE chat_id=_chat_id AND user_id=auth.uid());
$$;

REVOKE ALL ON FUNCTION public.internal_chat_is_member(uuid) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.internal_chat_is_member(uuid) TO authenticated;

CREATE POLICY chat_member_read ON public.internal_chats FOR SELECT TO authenticated USING (public.internal_chat_is_member(id));

CREATE POLICY chat_members_read ON public.internal_chat_members FOR SELECT TO authenticated USING (public.internal_chat_is_member(chat_id));

CREATE POLICY chat_messages_read ON public.internal_chat_messages FOR SELECT TO authenticated USING (public.internal_chat_is_member(chat_id));

CREATE POLICY chat_messages_send ON public.internal_chat_messages FOR INSERT TO authenticated WITH CHECK (public.internal_chat_is_member(chat_id) AND sender_id=auth.uid());

CREATE FUNCTION public.internal_chat_people() RETURNS TABLE(id uuid,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.full_name FROM public.profiles p WHERE public.is_firm_member() AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.id) ORDER BY p.full_name;
$$;

REVOKE ALL ON FUNCTION public.internal_chat_people() FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.internal_chat_people() TO authenticated;

CREATE FUNCTION public.internal_chat_create(_kind text,_name text,_members uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _me uuid := auth.uid(); _id uuid; _ids uuid[]; _key text;
BEGIN
 IF NOT public.is_firm_member() THEN RAISE EXCEPTION 'Acceso exclusivo del estudio'; END IF;
 SELECT array_agg(DISTINCT x) INTO _ids FROM unnest(array_append(COALESCE(_members,ARRAY[]::uuid[]),_me)) x WHERE x IS NOT NULL;
 IF EXISTS(SELECT 1 FROM unnest(_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id WHERE p.id=x)) THEN RAISE EXCEPTION 'Integrante no disponible'; END IF;
 IF _kind='direct' THEN
  IF cardinality(_ids)<>2 THEN RAISE EXCEPTION 'Seleccioná una persona'; END IF;
  SELECT string_agg(x::text,':' ORDER BY x::text) INTO _key FROM unnest(_ids) x;
  INSERT INTO public.internal_chats(kind,direct_key,created_by) VALUES('direct',_key,_me) ON CONFLICT(direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING id INTO _id;
 ELSIF _kind='group' THEN
  IF length(trim(COALESCE(_name,''))) NOT BETWEEN 1 AND 100 OR cardinality(_ids)<2 THEN RAISE EXCEPTION 'Ingresá nombre e integrantes'; END IF;
  INSERT INTO public.internal_chats(kind,name,created_by) VALUES('group',trim(_name),_me) RETURNING id INTO _id;
 ELSE RAISE EXCEPTION 'Tipo de chat inválido'; END IF;
 INSERT INTO public.internal_chat_members(chat_id,user_id) SELECT _id,x FROM unnest(_ids) x ON CONFLICT DO NOTHING;
 RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.internal_chat_create(text,text,uuid[]) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.internal_chat_create(text,text,uuid[]) TO authenticated;

CREATE FUNCTION public.internal_chat_add_members(_chat_id uuid,_members uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.internal_chat_is_member(_chat_id) OR NOT EXISTS(SELECT 1 FROM public.internal_chats WHERE id=_chat_id AND kind='group' AND created_by=auth.uid()) THEN RAISE EXCEPTION 'Solo quien creó el grupo puede agregar integrantes'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(_members) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id WHERE p.id=x)) THEN RAISE EXCEPTION 'Integrante no disponible'; END IF;
 INSERT INTO public.internal_chat_members(chat_id,user_id) SELECT _chat_id,x FROM unnest(_members) x ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.internal_chat_add_members(uuid,uuid[]) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.internal_chat_add_members(uuid,uuid[]) TO authenticated;

CREATE FUNCTION public.internal_chat_touch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN UPDATE public.internal_chats SET updated_at=now() WHERE id=NEW.chat_id; RETURN NEW; END; $$;

REVOKE ALL ON FUNCTION public.internal_chat_touch() FROM PUBLIC,anon,authenticated;

CREATE TRIGGER internal_chat_new_message AFTER INSERT ON public.internal_chat_messages FOR EACH ROW EXECUTE FUNCTION public.internal_chat_touch();

ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_chats,public.internal_chat_members,public.internal_chat_messages;

-- ===== drizzle/migrations/0022_harden_gallery.sql =====
DROP POLICY IF EXISTS gp_read ON public.gallery_photos;

CREATE POLICY gp_read ON public.gallery_photos FOR SELECT TO authenticated USING (public.is_firm_member());

DROP POLICY IF EXISTS gp_insert ON public.gallery_photos;

CREATE POLICY gp_insert ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.is_firm_member());

DROP POLICY IF EXISTS gallery_read ON storage.objects;

CREATE POLICY gallery_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'gallery' AND public.is_firm_member());

DROP POLICY IF EXISTS gallery_insert ON storage.objects;

CREATE POLICY gallery_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND public.is_firm_member() AND owner = auth.uid());

DROP POLICY IF EXISTS gallery_delete ON storage.objects;

CREATE POLICY gallery_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND (owner = auth.uid() OR public.can_edit(auth.uid())));

-- ===== drizzle/migrations/0023_internal_chat_extras.sql =====
ALTER TABLE public.internal_chat_messages ADD COLUMN attachment_path text, ADD COLUMN attachment_name text, ADD COLUMN attachment_type text;

ALTER TABLE public.internal_chat_messages DROP CONSTRAINT IF EXISTS internal_chat_messages_body_check;

ALTER TABLE public.internal_chat_messages ADD CONSTRAINT internal_chat_messages_body_check CHECK (length(body) <= 4000 AND (length(trim(body)) >= 1 OR attachment_path IS NOT NULL));

ALTER TABLE public.internal_chat_messages ADD CONSTRAINT internal_chat_messages_attachment_path CHECK (attachment_path IS NULL OR split_part(attachment_path,'/',1) = chat_id::text);

GRANT DELETE ON public.internal_chat_messages TO authenticated;

ALTER TABLE public.internal_chat_messages REPLICA IDENTITY FULL;

CREATE POLICY chat_messages_delete_own ON public.internal_chat_messages FOR DELETE TO authenticated USING (sender_id = auth.uid() AND public.internal_chat_is_member(chat_id));

CREATE TABLE public.internal_chat_reads (
 chat_id uuid NOT NULL REFERENCES public.internal_chats(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 last_read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (chat_id,user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.internal_chat_reads TO authenticated;

GRANT ALL ON public.internal_chat_reads TO service_role;

ALTER TABLE public.internal_chat_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_reads_read ON public.internal_chat_reads FOR SELECT TO authenticated USING (public.internal_chat_is_member(chat_id));

CREATE POLICY chat_reads_insert ON public.internal_chat_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.internal_chat_is_member(chat_id));

CREATE POLICY chat_reads_update ON public.internal_chat_reads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.internal_chat_is_member(chat_id));

CREATE FUNCTION public.internal_chat_unread() RETURNS TABLE(chat_id uuid, unread bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT m.chat_id, count(*) FROM public.internal_chat_messages m
 JOIN public.internal_chat_members cm ON cm.chat_id=m.chat_id AND cm.user_id=auth.uid()
 LEFT JOIN public.internal_chat_reads r ON r.chat_id=m.chat_id AND r.user_id=auth.uid()
 WHERE public.is_firm_member() AND m.sender_id<>auth.uid() AND m.created_at > COALESCE(r.last_read_at,'-infinity'::timestamptz)
 GROUP BY m.chat_id;
$$;

REVOKE ALL ON FUNCTION public.internal_chat_unread() FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.internal_chat_unread() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_chat_reads;

CREATE POLICY chat_files_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='chat-files' AND public.internal_chat_is_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY chat_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='chat-files' AND owner=auth.uid() AND public.internal_chat_is_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY chat_files_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='chat-files' AND owner=auth.uid());

-- ===== drizzle/migrations/0025_assistant_threads.sql =====
CREATE TABLE public.assistant_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Nueva conversación',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_threads TO authenticated;

GRANT ALL ON public.assistant_threads TO service_role;

ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own threads" ON public.assistant_threads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.assistant_messages TO authenticated;

GRANT ALL ON public.assistant_messages TO service_role;

ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own messages" ON public.assistant_messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE INDEX ON public.assistant_messages (thread_id, created_at);

-- ===== drizzle/migrations/0026_articles_editable.sql =====
GRANT UPDATE ON public.articles TO authenticated;

CREATE POLICY articles_update_editors ON public.articles FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- ===== Buckets de Storage =====
INSERT INTO storage.buckets (id,name,public) VALUES ('chat-files','chat-files',false),('gallery','gallery',false),('official-files','official-files',false) ON CONFLICT (id) DO NOTHING;
