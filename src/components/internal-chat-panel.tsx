import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CheckCheck, FileText, LoaderCircle, MessageCircle, Paperclip, Plus, Send, Smile, Trash2, UserPlus, Users, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CHAT_EMOJIS, sanitizeFileName, unreadQuery, chatPeopleQuery, chatsQuery, chatTitle, type ChatPerson, type InternalChat } from "@/lib/internal-chat";
import { validateChat } from "@/lib/internal-chat-validation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function InternalChatPanel({ me, chatId }: { me: string; chatId?: string }) {
  const qc = useQueryClient();
  const { data: chats = [], isPending, error } = useQuery(chatsQuery);
  const { data: people = [], error: peopleError } = useQuery(chatPeopleQuery);
  const { data: unread = {} } = useQuery(unreadQuery);
  const [mode, setMode] = useState<"direct" | "group" | "add" | null>(null);
  const [filter, setFilter] = useState("");
  const [connection, setConnection] = useState("Conectando…");
  const active = chats.find((chat) => chat.id === chatId);

  useEffect(() => {
    const channel = supabase.channel(`internal-chat-list-${me}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_chats" }, () => qc.invalidateQueries({ queryKey: chatsQuery.queryKey }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_chat_members", filter: `user_id=eq.${me}` }, () => qc.invalidateQueries({ queryKey: chatsQuery.queryKey }))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setConnection("En línea"); qc.invalidateQueries({ queryKey: ["internal-chat"] }); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnection("Reconectando…");
      });
    return () => { void supabase.removeChannel(channel); };
  }, [me, qc]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Chat interno</h1>
        <span className="text-xs text-muted-foreground" role="status">{connection}</span>
      </header>
      {(error || peopleError) && <p role="alert" className="text-sm text-destructive">No pudimos cargar los chats. <Button variant="link" onClick={() => qc.invalidateQueries({ queryKey: ["internal-chat"] })}>Reintentar</Button></p>}
      <div className="grid h-[640px] max-h-[75dvh] min-h-[420px] overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={cn("flex min-h-0 flex-col border-border md:border-r", chatId && "hidden md:flex")}>
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Conversaciones</h2>
              <Button size="icon" variant="ghost" aria-label="Nuevo chat" title="Nuevo chat" onClick={() => setMode("direct")}><Plus /></Button>
            </div>
            <Input aria-label="Buscar chats" placeholder="Buscar chat o grupo…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <Button variant="outline" className="w-full" onClick={() => setMode("group")}><Users /> Crear nuevo grupo</Button>
          </div>
          <nav aria-label="Chats activos" className="min-h-0 flex-1 overflow-y-auto p-2">
            {isPending && <p className="p-3 text-sm text-muted-foreground">Cargando chats…</p>}
            {!isPending && !chats.length && <p className="p-3 text-sm text-muted-foreground">Todavía no tenés conversaciones.</p>}
            {chats.filter((chat) => chatTitle(chat, people, me).toLowerCase().includes(filter.toLowerCase())).map((chat) => (
              <Button asChild variant="ghost" key={chat.id} className={cn("mb-1 h-auto w-full justify-start px-3 py-3", chat.id === chatId && "bg-secondary text-secondary-foreground")}>
                <Link to="/chat/$chatId" params={{ chatId: chat.id }}>
                  {chat.kind === "group" ? <Users /> : <MessageCircle />}
                  <span className="min-w-0 text-left"><span className="block truncate">{chatTitle(chat, people, me)}</span><span className="block text-xs font-normal text-muted-foreground">{chat.kind === "group" ? `${chat.internal_chat_members.length} integrantes` : "Mensaje directo"}</span></span>
                  {!!unread[chat.id] && chat.id !== chatId && <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-5 text-destructive-foreground" aria-label={`${unread[chat.id]} sin leer`}>{unread[chat.id]}</span>}
                </Link>
              </Button>
            ))}
          </nav>
        </aside>
        <section className={cn("flex min-h-0 min-w-0 flex-col", !chatId && "hidden md:flex")} aria-label="Conversación">
          {active ? <Conversation key={active.id} chat={active} me={me} people={people} onAdd={() => setMode("add")} /> : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
              <MessageCircle className="size-10" aria-hidden />
              <p>{chatId ? (isPending ? "Cargando conversación…" : "Esta conversación no está disponible.") : "Tus conversaciones con el equipo"}</p>
              <Button variant="outline" onClick={() => setMode("direct")}><Plus /> Nuevo chat</Button>
              {chatId && <Button asChild variant="link"><Link to="/chat">Volver a mis chats</Link></Button>}
            </div>
          )}
        </section>
      </div>
      {mode && <ChatDialog mode={mode} me={me} people={people} chat={active} onClose={() => setMode(null)} />}
    </div>
  );
}

type ChatMessage = { id: string; sender_id: string; body: string; created_at: string; attachment_path: string | null; attachment_name: string | null; attachment_type: string | null };

function Attachment({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const { data: url } = useQuery({
    queryKey: ["internal-chat", "file", message.attachment_path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("chat-files").createSignedUrl(message.attachment_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 50 * 60 * 1000,
  });
  if (!url) return <p className="text-xs opacity-75">Cargando adjunto…</p>;
  if (message.attachment_type?.startsWith("image/")) return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={message.attachment_name ?? "Imagen adjunta"} className="mb-1 max-h-60 rounded-md" /></a>;
  return <a href={url} target="_blank" rel="noreferrer" className={cn("mb-1 flex items-center gap-2 rounded-md border px-2 py-1.5 underline-offset-2 hover:underline", mine ? "border-primary-foreground/30" : "border-border")}><FileText className="size-4 shrink-0" aria-hidden /><span className="truncate">{message.attachment_name ?? "Archivo"}</span></a>;
}

function Conversation({ chat, me, people, onAdd }: { chat: InternalChat; me: string; people: ChatPerson[]; onAdd: () => void }) {
  const qc = useQueryClient();
  const key = ["internal-chat", "messages", chat.id];
  const readsKey = ["internal-chat", "reads", chat.id];
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTyping = useRef(0);
  const [limit, setLimit] = useState(100);
  const name = (id: string) => people.find((p) => p.id === id)?.full_name || "Integrante";
  const { data: messages = [], isPending, error } = useQuery({
    queryKey: [...key, limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("internal_chat_messages").select("id,sender_id,body,created_at,attachment_path,attachment_name,attachment_type").eq("chat_id", chat.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
      if (error) throw error;
      return ((data ?? []) as ChatMessage[]).reverse();
    },
  });
  const { data: reads = [] } = useQuery({
    queryKey: readsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("internal_chat_reads").select("user_id,last_read_at").eq("chat_id", chat.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    const channel = supabase.channel(`internal-chat-messages-${chat.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_chat_messages", filter: `chat_id=eq.${chat.id}` }, () => qc.invalidateQueries({ queryKey: ["internal-chat", "messages", chat.id] }))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "internal_chat_messages" }, () => qc.invalidateQueries({ queryKey: ["internal-chat", "messages", chat.id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_chat_reads", filter: `chat_id=eq.${chat.id}` }, () => qc.invalidateQueries({ queryKey: ["internal-chat", "reads", chat.id] }))
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const uid = (payload as { user_id?: string })?.user_id;
        if (uid && uid !== me) setTyping((t) => ({ ...t, [uid]: Date.now() }));
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") qc.invalidateQueries({ queryKey: ["internal-chat", "messages", chat.id] }); });
    channelRef.current = channel;
    const timer = setInterval(() => setTyping((t) => Object.fromEntries(Object.entries(t).filter(([, at]) => Date.now() - at < 3500))), 1000);
    return () => { clearInterval(timer); channelRef.current = null; void supabase.removeChannel(channel); };
  }, [chat.id, me, qc]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (!lastId) return;
    void supabase.from("internal_chat_reads").upsert({ chat_id: chat.id, user_id: me, last_read_at: new Date().toISOString() }).then(() => qc.invalidateQueries({ queryKey: ["internal-chat", "unread"] }));
  }, [lastId, chat.id, me, qc]);

  function notifyTyping() {
    if (Date.now() - lastTyping.current < 2000) return;
    lastTyping.current = Date.now();
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: me } });
  }

  async function send() {
    if (sending) return;
    const body = draft.trim();
    if (!body && !file) return;
    if (body.length > 4000) { toast.error("El mensaje es demasiado largo."); return; }
    setSending(true);
    try {
      let attachment: Pick<ChatMessage, "attachment_path" | "attachment_name" | "attachment_type"> = { attachment_path: null, attachment_name: null, attachment_type: null };
      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error("El archivo supera los 20 MB.");
        const path = `${chat.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file, file.type ? { contentType: file.type } : undefined);
        if (upErr) throw new Error("No se pudo subir el archivo.");
        attachment = { attachment_path: path, attachment_name: file.name.slice(0, 200), attachment_type: file.type || null };
      }
      const { error } = await supabase.from("internal_chat_messages").insert({ chat_id: chat.id, sender_id: me, body, ...attachment });
      if (error) throw error;
      setDraft(""); setFile(null);
      await qc.invalidateQueries({ queryKey: key });
    } catch (e) { toast.error(e instanceof Error && e.message.includes("archivo") ? e.message : "No se pudo enviar. Tu mensaje sigue guardado acá."); }
    finally { setSending(false); input.current?.focus(); }
  }

  async function remove(message: ChatMessage) {
    if (!window.confirm("¿Eliminar este mensaje? Se borrará para todos.")) return;
    const { error } = await supabase.from("internal_chat_messages").delete().eq("id", message.id);
    if (error) { toast.error("No se pudo eliminar el mensaje."); return; }
    if (message.attachment_path) void supabase.storage.from("chat-files").remove([message.attachment_path]);
    toast.success("Mensaje eliminado");
    await qc.invalidateQueries({ queryKey: key });
  }

  const others = reads.filter((r) => r.user_id !== me);
  const isRead = (m: ChatMessage) => others.some((r) => r.last_read_at >= m.created_at);
  const typingNames = Object.keys(typing).map(name);

  return <>
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Button asChild size="icon" variant="ghost" className="md:hidden" aria-label="Volver a chats"><Link to="/chat"><ArrowLeft /></Link></Button>
      <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{chatTitle(chat, people, me)}</h2><p className="truncate text-xs text-muted-foreground">{typingNames.length ? <span className="italic text-primary">{chat.kind === "group" ? `${typingNames.join(", ")} está escribiendo…` : "Escribiendo…"}</span> : chat.internal_chat_members.map((member) => name(member.user_id)).join(", ")}</p></div>
      {chat.kind === "group" && chat.created_by === me && <Button size="icon" variant="ghost" aria-label="Agregar integrantes" title="Agregar integrantes" onClick={onAdd}><UserPlus /></Button>}
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-label="Mensajes" aria-live="polite">
      {messages.length >= limit && <div className="flex justify-center"><Button variant="ghost" size="sm" onClick={() => setLimit((n) => n + 100)}>Cargar anteriores</Button></div>}
      {isPending && <p className="text-sm text-muted-foreground">Cargando mensajes…</p>}
      {error && <p className="text-sm text-destructive" role="alert">No se pudieron cargar los mensajes. <Button variant="link" onClick={() => qc.invalidateQueries({ queryKey: key })}>Reintentar</Button></p>}
      {messages.map((message) => { const mine = message.sender_id === me; return <div key={message.id} className={cn("group flex items-start gap-1", mine ? "justify-end" : "justify-start")}>
        {mine && <Button size="icon" variant="ghost" className="size-7 opacity-60 focus-visible:opacity-100 group-hover:opacity-100" aria-label="Eliminar mensaje" title="Eliminar mensaje" onClick={() => void remove(message)}><Trash2 className="size-3.5" /></Button>}
        <article className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
          {!mine && <p className="mb-1 text-xs font-semibold">{name(message.sender_id)}</p>}
          {message.attachment_path && <Attachment message={message} mine={mine} />}
          {message.body && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>}
          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
            <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
            {mine && (isRead(message) ? <CheckCheck className="size-3.5" aria-label="Leído" /> : <Check className="size-3.5" aria-label="Enviado" />)}
          </p>
        </article>
      </div>; })}
      <div ref={bottom} />
    </div>
    {file && <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm"><Paperclip className="size-4" aria-hidden /><span className="min-w-0 flex-1 truncate">{file.name}</span><Button size="icon" variant="ghost" className="size-7" aria-label="Quitar adjunto" onClick={() => setFile(null)}><X className="size-4" /></Button></div>}
    <form className="flex items-end gap-1 border-t border-border p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <input ref={fileInput} type="file" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <Button type="button" size="icon" variant="ghost" aria-label="Adjuntar archivo o imagen" title="Adjuntar archivo o imagen" onClick={() => fileInput.current?.click()}><Paperclip /></Button>
      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
        <PopoverTrigger asChild><Button type="button" size="icon" variant="ghost" aria-label="Insertar emoji" title="Emojis"><Smile /></Button></PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2"><div className="grid grid-cols-6 gap-1">{CHAT_EMOJIS.map((emoji) => <button key={emoji} type="button" className="rounded-md p-1 text-xl hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Emoji ${emoji}`} onClick={() => { setDraft((d) => d + emoji); setEmojiOpen(false); input.current?.focus(); }}>{emoji}</button>)}</div></PopoverContent>
      </Popover>
      <Textarea ref={input} aria-label="Mensaje" placeholder="Escribí un mensaje…" rows={2} maxLength={4000} value={draft} onChange={(event) => { setDraft(event.target.value); notifyTyping(); }} className="max-h-32 min-h-16 flex-1 resize-none" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
      <Button type="submit" size="icon" aria-label="Enviar mensaje" disabled={sending || (!draft.trim() && !file)}>{sending ? <LoaderCircle className="animate-spin" /> : <Send />}</Button>
    </form>
  </>;
}

function ChatDialog({ mode, me, people, chat, onClose }: { mode: "direct" | "group" | "add"; me: string; people: ChatPerson[]; chat: InternalChat | undefined; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const available = people.filter((p) => p.id !== me && (mode !== "add" || !chat?.internal_chat_members.some((m) => m.user_id === p.id)));
  async function save() {
    setSaving(true);
    try {
      if (mode === "add") {
        if (!chat || !selected.length) throw new Error("Seleccioná integrantes");
        const { error } = await supabase.rpc("internal_chat_add_members", { _chat_id: chat.id, _members: selected });
        if (error) throw error;
      } else {
        const members = validateChat(mode, name, selected);
        const { data, error } = await supabase.rpc("internal_chat_create", { _kind: mode, _name: name, _members: members });
        if (error) throw error;
        if (data) await navigate({ to: "/chat/$chatId", params: { chatId: data } });
      }
      await qc.invalidateQueries({ queryKey: chatsQuery.queryKey });
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar el chat"); }
    finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto">
    <DialogTitle>{mode === "group" ? "Crear nuevo grupo" : mode === "add" ? "Agregar integrantes" : "Nuevo chat"}</DialogTitle>
    <DialogDescription>{mode === "direct" ? "Seleccioná a una persona del estudio." : "Seleccioná los integrantes del equipo."}</DialogDescription>
    {mode === "group" && <label className="space-y-2 text-sm font-medium">Nombre del grupo<Input aria-label="Nombre del grupo" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></label>}
    <Input aria-label="Buscar integrante" placeholder="Buscar integrante…" value={search} onChange={(e) => setSearch(e.target.value)} />
    <div className="max-h-60 overflow-y-auto space-y-1">
      {available.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase())).map((person) => <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary">
        <input type={mode === "direct" ? "radio" : "checkbox"} name="chat-members" checked={selected.includes(person.id)} onChange={(e) => setSelected((current) => mode === "direct" ? [person.id] : e.target.checked ? [...current, person.id] : current.filter((id) => id !== person.id))} className="size-4 accent-primary" />{person.full_name || "Integrante del estudio"}
      </label>)}
      {!available.length && <p className="text-sm text-muted-foreground">No hay integrantes disponibles.</p>}
    </div>
    <Button onClick={save} disabled={saving || !selected.length || (mode === "group" && !name.trim())}>{saving && <LoaderCircle className="animate-spin" />}{mode === "add" ? "Agregar integrantes" : mode === "group" ? "Crear grupo" : "Iniciar chat"}</Button>
  </DialogContent></Dialog>;
}