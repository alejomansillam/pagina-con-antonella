import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Megaphone, Plus, MessageCircle, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMOJIS = ["👍", "❤️", "🎉", "👏"];

const annQuery = {
  queryKey: ["announcements"] as const,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    return data ?? [];
  },
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
};

const socialQuery = {
  queryKey: ["announcement_social"] as const,
  queryFn: async () => {
    const [r, c, u] = await Promise.all([
      supabase.from("announcement_reactions").select("*"),
      supabase.from("announcement_comments").select("*").order("created_at"),
      supabase.auth.getUser(),
    ]);
    return { reactions: r.data ?? [], comments: c.data ?? [], uid: u.data.user?.id ?? null };
  },
  refetchInterval: 30_000,
};

export function AnnouncementsBoard() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(annQuery);
  const { data: social } = useQuery(socialQuery);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const { data: evLinks = [] } = useQuery({
    queryKey: ["calendar_event_links"],
    queryFn: async () => {
      const { data } = await supabase.from("calendar_events").select("announcement_id, event_date").not("announcement_id", "is", null);
      return data ?? [];
    },
  });
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["announcements"] });
    qc.invalidateQueries({ queryKey: ["announcement_social"] });
  };

  const myName = async (uid: string) => {
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
    return p?.full_name ?? null;
  };

  const publish = async () => {
    if (!title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      level: urgent ? "urgente" : "info",
      author_id: u.user!.id,
      author_name: await myName(u.user!.id),
    });
    if (error) { toast.error("No se pudo publicar el aviso"); return; }
    setTitle(""); setBody(""); setUrgent(false); setFormOpen(false);
    refresh();
    toast.success("Aviso publicado");
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    refresh();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    const { error } = await supabase.from("announcements").update({ pinned: !pinned }).eq("id", id);
    if (error) toast.error("No se pudo fijar"); else refresh();
  };

  const react = async (id: string, emoji: string) => {
    const uid = social?.uid;
    if (!uid) return;
    const mine = social.reactions.find((r) => r.announcement_id === id && r.user_id === uid && r.emoji === emoji);
    if (mine) await supabase.from("announcement_reactions").delete().eq("id", mine.id);
    else await supabase.from("announcement_reactions").insert({ announcement_id: id, user_id: uid, emoji });
    refresh();
  };

  const comment = async (id: string) => {
    const uid = social?.uid;
    if (!uid || !draft.trim()) return;
    const { error } = await supabase.from("announcement_comments").insert({
      announcement_id: id, user_id: uid, body: draft.trim(), author_name: await myName(uid),
    });
    if (error) { toast.error("No se pudo comentar"); return; }
    setDraft("");
    refresh();
  };

  const delComment = async (cid: string) => {
    await supabase.from("announcement_comments").delete().eq("id", cid);
    refresh();
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Megaphone className="size-5 text-primary" /> Novedades del estudio
        </h2>
        {editor && !formOpen && (
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}><Plus className="size-4" /> Nueva novedad</Button>
        )}
      </div>
      {editor && formOpen && (
        <div className="mt-4 space-y-2 rounded-lg bg-secondary p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del aviso (ej.: Corte de saldo hoy 18 hs)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Detalle (opcional)" rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> Urgente
            </label>
            <span className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={publish}>Publicar</Button>
            </span>
          </div>
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {items.length === 0 && <li className="text-sm text-muted-foreground">No hay avisos por ahora.</li>}
        {items.map((a) => {
          const comments = (social?.comments ?? []).filter((c) => c.announcement_id === a.id);
          const reactions = (social?.reactions ?? []).filter((r) => r.announcement_id === a.id);
          return (
            <li key={a.id} className={cn("rounded-lg border p-3",
              a.pinned ? "border-primary bg-primary/5" : a.level === "urgente" ? "border-n1 bg-n1/10" : "border-border")}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {a.pinned && <Pin className="mr-1.5 inline size-4 text-primary" aria-label="Fijado" />}
                  {a.level === "urgente" && <span className="mr-2 rounded bg-n1 px-1.5 py-0.5 text-xs text-n1-foreground">URGENTE</span>}
                  {a.title}
                </p>
                {editor && (
                  <div className="flex gap-2">
                    <button onClick={() => togglePin(a.id, a.pinned)} aria-label={a.pinned ? "Desfijar" : "Fijar arriba"} className="text-muted-foreground hover:text-foreground">
                      {a.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                    </button>
                    <button onClick={() => remove(a.id)} aria-label="Borrar aviso" className="text-muted-foreground hover:text-foreground">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
              {a.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>}
              {(() => {
                const ev = evLinks.find((x) => x.announcement_id === a.id);
                return ev ? (
                  <Link to="/calendario" search={{ fecha: ev.event_date }} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <CalendarDays className="size-3.5" /> Ver en el calendario
                  </Link>
                ) : null;
              })()}
              <p className="mt-1 text-xs text-muted-foreground">
                {a.author_name ?? "Supervisión"} · {new Date(a.created_at).toLocaleString("es-AR")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {EMOJIS.map((e) => {
                  const n = reactions.filter((r) => r.emoji === e).length;
                  const mine = reactions.some((r) => r.emoji === e && r.user_id === social?.uid);
                  return (
                    <button key={e} onClick={() => react(a.id, e)}
                      className={cn("rounded-full border px-2 py-0.5 text-xs", mine ? "border-primary bg-primary/10" : "border-border hover:bg-secondary")}>
                      {e}{n > 0 && <span className="ml-1">{n}</span>}
                    </button>
                  );
                })}
                <button onClick={() => { setOpenComments(openComments === a.id ? null : a.id); setDraft(""); }}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <MessageCircle className="size-3.5" /> {comments.length} comentario{comments.length === 1 ? "" : "s"}
                </button>
              </div>
              {openComments === a.id && (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                      <p><span className="font-semibold">{c.author_name ?? "Compañero/a"}:</span> {c.body}</p>
                      {(editor || c.user_id === social?.uid) && (
                        <button onClick={() => delComment(c.id)} aria-label="Borrar comentario" className="text-muted-foreground hover:text-foreground">
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && comment(a.id)} placeholder="Escribí un comentario…"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                    <Button size="sm" onClick={() => comment(a.id)} aria-label="Enviar"><Send className="size-4" /></Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
