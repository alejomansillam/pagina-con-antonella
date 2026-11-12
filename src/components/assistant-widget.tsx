import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { BookOpenCheck, Loader2, MessageSquarePlus, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askAssistant } from "@/lib/assistant.functions";
import { toast } from "sonner";

type Thread = { id: string; title: string; updated_at: string };
type Msg = { id: string; role: "user" | "assistant"; content: string };

const threadsKey = ["assistant_threads"] as const;

export function AssistantChat({ threadId, onSelect }: { threadId: string | null; onSelect: (id: string | null) => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const threads = useQuery({
    queryKey: threadsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("assistant_threads").select("id, title, updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Thread[];
    },
  });
  const messages = useQuery({
    queryKey: ["assistant_messages", threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase.from("assistant_messages").select("id, role, content").eq("thread_id", threadId!).order("created_at");
      if (error) throw error;
      return data as Msg[];
    },
  });

  const send = useMutation({
    mutationFn: async (message: string) => {
      let id = threadId;
      if (!id) {
        const { data, error } = await supabase.from("assistant_threads").insert({}).select("id").single();
        if (error) throw error;
        id = data.id;
        onSelect(id);
      }
      await askAssistant({ data: { threadId: id, message } });
      return id;
    },
    onMutate: (m) => { setPending(m); setText(""); },
    onError: (e: Error, m) => { setText(m); toast.error(e.message || "No se pudo enviar la consulta"); },
    onSettled: async (id) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: threadsKey }),
        qc.invalidateQueries({ queryKey: ["assistant_messages", id ?? threadId] }),
      ]);
      setPending(null);
      inputRef.current?.focus();
    },
  });

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta conversación?")) return;
    const { error } = await supabase.from("assistant_threads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (id === threadId) onSelect(null);
    qc.invalidateQueries({ queryKey: threadsKey });
  };

  useEffect(() => { inputRef.current?.focus(); }, [threadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.data, pending]);

  const submit = () => { const m = text.trim(); if (m && !send.isPending) send.mutate(m); };
  const list = threadId ? messages.data ?? [] : [];

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-48 shrink-0 flex-col border-r border-border sm:flex" aria-label="Conversaciones">
        <button type="button" onClick={() => onSelect(null)} className="m-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring">
          <MessageSquarePlus className="size-3.5" aria-hidden /> Nueva conversación
        </button>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 text-xs">
          {(threads.data ?? []).map((t) => (
            <li key={t.id} className={`group flex items-center rounded-md ${t.id === threadId ? "bg-secondary" : "hover:bg-secondary/60"}`}>
              <button type="button" onClick={() => onSelect(t.id)} className="flex-1 truncate px-2 py-1.5 text-left">{t.title}</button>
              <button type="button" onClick={() => remove(t.id)} aria-label={`Eliminar ${t.title}`} className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-destructive">
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sm:hidden flex gap-2 border-b border-border p-2">
          <select aria-label="Elegir conversación" value={threadId ?? ""} onChange={(e) => onSelect(e.target.value || null)} className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
            <option value="">Nueva conversación</option>
            {(threads.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm" role="log" aria-live="polite">
          {list.length === 0 && !pending && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Preguntame sobre los manuales y protocolos del portal. Por ejemplo: «¿En cuánto tiempo respondo un WhatsApp en mora tardía?»
            </div>
          )}
          {list.map((m) => <Bubble key={m.id} m={m} />)}
          {pending && <Bubble m={{ id: "p", role: "user", content: pending }} />}
          {pending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden /> Buscando en los manuales…</div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-2 border-t border-border p-2">
          <textarea
            ref={inputRef} value={text} rows={2} maxLength={4000} aria-label="Escribí tu consulta"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Escribí tu consulta…"
            className="min-w-0 flex-1 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
          <button type="submit" disabled={!text.trim() || send.isPending} aria-label="Enviar" className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50">
            {send.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: Msg }) {
  if (m.role === "user")
    return <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">{m.content}</div>;
  return (
    <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
      <ReactMarkdown components={{ a: ({ href, children }) => href?.startsWith("/") ? <Link to={href as "/"} className="text-primary underline">{children}</Link> : <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>
        {m.content}
      </ReactMarkdown>
    </div>
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  return (
    <>
      {open && (
        <div role="dialog" aria-label="Asistente del portal" className="fixed inset-x-2 bottom-20 z-50 flex h-[70vh] max-h-[560px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[560px]">
          <header className="flex items-center gap-2 border-b border-border bg-primary px-3 py-2 text-primary-foreground">
            <BookOpenCheck className="size-4" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Asistente del portal</p>
              <p className="text-[0.65rem] opacity-80">Responde con los manuales del estudio</p>
            </div>
            {threadId && (
              <Link to="/asistente/$threadId" params={{ threadId }} onClick={() => setOpen(false)} className="rounded px-2 py-1 text-xs underline-offset-2 hover:underline">Pantalla completa</Link>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente" className="rounded p-1 hover:bg-primary-foreground/10"><X className="size-4" aria-hidden /></button>
          </header>
          <div className="min-h-0 flex-1"><AssistantChat threadId={threadId} onSelect={setThreadId} /></div>
        </div>
      )}
      <button
        type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Cerrar asistente" : "Abrir asistente del portal"} aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <BookOpenCheck className="size-5" aria-hidden /> <span className="hidden sm:inline">Asistente</span>
      </button>
    </>
  );
}
