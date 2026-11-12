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
