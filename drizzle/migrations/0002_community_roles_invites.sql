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
