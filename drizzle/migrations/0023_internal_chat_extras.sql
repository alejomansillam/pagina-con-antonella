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