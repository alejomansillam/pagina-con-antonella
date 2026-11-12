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

-- 3. Seed the institutional directory (internos MicroSIP + WhatsApp corporativo)
INSERT INTO public.staff_directory (full_name, nickname, gm_username, microsip_ext, whatsapp, whatsapp_alt, role_title, team, kind, position) VALUES
  ('Gonzalo Mansilla Garzón', 'Gonzalo', NULL, '401', NULL, NULL, 'Director y Titular del Estudio', 'Dirección General', 'direccion', 1),
  ('Javier Mansilla Garzón', 'Javier', NULL, '451', NULL, NULL, 'Dirección', 'Dirección General', 'direccion', 2),
  ('Ramón Arrambide', 'Ramón', NULL, '400', NULL, NULL, 'Gerencia', 'Gerencia', 'gerencia', 3),
  ('Milagros Villegas', 'Mili', 'mvillegas', '101', NULL, NULL, 'Supervisora General', 'Supervisión', 'supervision', 4),
  ('Alejo Mansilla', 'Alejo', 'amansillam', '128', NULL, NULL, 'Supervisor de Operaciones', 'Supervisión', 'supervision', 5),
  ('Antonella López', 'Anto', 'alopez', '115', '3516815855', NULL, 'Gestora Senior', 'Gestión', 'senior', 6),
  ('Ana Rueda', 'Ana', 'arueda', '106', '3515304763', '3518070788', 'Gestora', 'Gestión', 'gestor', 10),
  ('Ana Paz', 'Ana Paz', 'apaz', '124', '3517686558', '3516428677', 'Gestora', 'Gestión', 'gestor', 11),
  ('Agus Báez', 'Agus', 'abaez', '110', '3512314552', '3518762168', 'Gestor', 'Gestión', 'gestor', 12),
  ('Agustina López', 'Agustina', 'aglopez', '107', NULL, NULL, 'Gestora', 'Gestión', 'gestor', 13),
  ('Alejandra Rivas', 'Alejandra', 'arivas', '122', '3518149762', NULL, 'Gestora', 'Gestión', 'gestor', 14),
  ('Alejo Povina', 'Alejo P.', 'apovina', '123', NULL, NULL, 'Gestor', 'Gestión', 'gestor', 15),
  ('Ariel Peralta', 'Ariel', 'japeralta', '102', '3515308562', '3517618148', 'Gestor', 'Gestión', 'gestor', 16),
  ('Candela Espeche', 'Cande', 'cespeche', '131', '3515071552', NULL, 'Gestora', 'Gestión', 'gestor', 17),
  ('Daniela Cortez', 'Dani', 'dcortez', '105', '3517344601', NULL, 'Gestora', 'Gestión', 'gestor', 18),
  ('Delfina Sesto', 'Delfi', 'dsesto', '120', '3516429418', '3518149423', 'Gestora', 'Gestión', 'gestor', 19),
  ('Giuliana Pancello', 'Giuli', 'gpancello', '133', '3516429768', '3518661189', 'Gestora', 'Gestión', 'gestor', 20),
  ('Gregorio Cámpora', 'Grego', 'gcampora', '137', '3513798092', NULL, 'Gestor', 'Gestión', 'gestor', 21),
  ('Gustavo Gaitán', 'Gustavo', 'ggaitan', '121', '3514597485', NULL, 'Gestor', 'Gestión', 'gestor', 22),
  ('Julieta Aráoz', 'Julieta', 'jaraoz', '139', '3518680418', NULL, 'Gestora', 'Gestión', 'gestor', 23),
  ('Keila Ludueña', 'Keila', 'kluduena', '132', '3518597205', NULL, 'Gestora', 'Gestión', 'gestor', 24),
  ('Luciana Hortas', 'Luciana', 'lhortas', '119', NULL, NULL, 'Gestora', 'Gestión', 'gestor', 25),
  ('Luciano', 'Luciano', NULL, NULL, '3518653325', NULL, 'Gestor', 'Gestión', 'gestor', 26),
  ('Benjamín', 'Benja', NULL, NULL, '3518148405', NULL, 'Gestor', 'Gestión', 'gestor', 27),
  ('Maica Cerón', 'Maica', 'mceron', '113', '3517014549', NULL, 'Gestora', 'Gestión', 'gestor', 28),
  ('Marcela Rotela', 'Marcela', 'mrotela', '114', NULL, NULL, 'Gestora', 'Gestión', 'gestor', 29),
  ('Marta Ávila', 'Marta', 'mavila', '108', '3516889973', NULL, 'Gestora', 'Gestión', 'gestor', 30),
  ('Moriana Rey', 'Moriana', 'mrey', '129', '3517340005', '3518679608', 'Gestora', 'Gestión', 'gestor', 31),
  ('Natalia López', 'Nati', 'nlopez', '125', '3516428480', NULL, 'Gestora', 'Gestión', 'gestor', 32),
  ('Pablo Medina', 'Pablo', 'pmedina', '112', '3513182439', NULL, 'Gestor', 'Gestión', 'gestor', 33),
  ('Paula López', 'Paula', 'plopez', '118', '3518144717', NULL, 'Gestora', 'Gestión', 'gestor', 34),
  ('Pilar Solano', 'Pilar', 'psolano', '116', '3513182307', '3516428966', 'Gestora', 'Gestión', 'gestor', 35),
  ('Rocío López', 'Ro', 'rlopez', '109', '3512296048', '3515176885', 'Gestora', 'Gestión', 'gestor', 36),
  ('Sofía Angelini', 'Sofía', 'sangelini', '103', '3517556935', NULL, 'Gestora', 'Gestión', 'gestor', 37),
  ('Valentina Romero', 'Valen', 'vromero', '104', '3513592316', NULL, 'Gestora', 'Gestión', 'gestor', 38),
  ('Adri', 'Adri', NULL, '403', NULL, NULL, 'Administración', 'Administración', 'area', 50),
  ('Judiciales', NULL, NULL, '305', NULL, NULL, 'Área Judiciales', 'Judiciales', 'area', 51),
  ('Línea Chattigo', NULL, NULL, NULL, '3517685032', NULL, 'Línea institucional de atención omnicanal', 'Líneas del Estudio', 'linea', 60),
  ('Línea Bircle', NULL, NULL, NULL, '3513280429', NULL, 'Línea institucional Bircle', 'Líneas del Estudio', 'linea', 61),
  ('Línea API', NULL, NULL, NULL, '3518002881', NULL, 'Línea institucional API', 'Líneas del Estudio', 'linea', 62)
ON CONFLICT (full_name) DO NOTHING;