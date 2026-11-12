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