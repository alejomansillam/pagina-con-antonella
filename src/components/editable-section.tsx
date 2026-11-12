import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { myRolesQuery, canEdit } from "@/lib/roles";

type LinkItem = { label: string; url: string };
type Section = { key: string; title: string; body: string; points: string[]; links: LinkItem[] };

const sectionQuery = (key: string) => ({
  queryKey: ["editable_section", key] as const,
  queryFn: async (): Promise<Section> => {
    const { data, error } = await supabase.from("editable_sections").select("key,title,body,points,links").eq("key", key).maybeSingle();
    if (error) throw error;
    return {
      key,
      title: data?.title ?? "",
      body: data?.body ?? "",
      points: (data?.points as string[]) ?? [],
      links: (data?.links as LinkItem[]) ?? [],
    };
  },
});

export function EditableSection({ sectionKey, fallbackTitle }: { sectionKey: string; fallbackTitle: string }) {
  const qc = useQueryClient();
  const { data } = useQuery(sectionQuery(sectionKey));
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);

  const s = data ?? { key: sectionKey, title: fallbackTitle, body: "", points: [], links: [] };
  const empty = !s.body && s.points.length === 0 && s.links.length === 0;

  const startEdit = () => {
    setDraft({ ...s, title: s.title || fallbackTitle, points: [...s.points], links: s.links.map((l) => ({ ...l })) });
    setOpen(true);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("editable_sections").upsert({
      key: sectionKey,
      title: draft.title,
      body: draft.body,
      points: draft.points.filter((p) => p.trim()),
      links: draft.links.filter((l) => l.label.trim() && l.url.trim()),
      updated_by: u.user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar: " + error.message);
      return;
    }
    toast.success("Sección actualizada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["editable_section", sectionKey] });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl">{s.title || fallbackTitle}</h2>
        {editor && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
        )}
      </div>
      {empty ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {editor ? "Sección vacía. Tocá «Editar» para cargar el contenido." : "Contenido en preparación."}
        </p>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          {s.body && <p className="whitespace-pre-line text-muted-foreground">{s.body}</p>}
          {s.points.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {s.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {s.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {s.links.map((l, i) => (
                <a key={i} href={l.url} target={l.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted">
                  <ExternalLink className="size-3" /> {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Editar sección</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4 text-sm">
              <label className="block">Título<Input className="mt-1" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
              <label className="block">Texto<Textarea className="mt-1 min-h-28" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></label>
              <div>
                <p className="mb-1">Puntos clave</p>
                {draft.points.map((p, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <Input value={p} onChange={(e) => { const pts = [...draft.points]; pts[i] = e.target.value; setDraft({ ...draft, points: pts }); }} />
                    <Button size="icon" variant="ghost" aria-label="Quitar punto" onClick={() => setDraft({ ...draft, points: draft.points.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, points: [...draft.points, ""] })}><Plus className="size-4" /> Agregar punto</Button>
              </div>
              <div>
                <p className="mb-1">Enlaces y archivos (pegá el link de Drive, web o sección)</p>
                {draft.links.map((l, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <Input placeholder="Nombre" value={l.label} onChange={(e) => { const ls = [...draft.links]; ls[i] = { ...l, label: e.target.value }; setDraft({ ...draft, links: ls }); }} />
                    <Input placeholder="https://..." value={l.url} onChange={(e) => { const ls = [...draft.links]; ls[i] = { ...l, url: e.target.value }; setDraft({ ...draft, links: ls }); }} />
                    <Button size="icon" variant="ghost" aria-label="Quitar enlace" onClick={() => setDraft({ ...draft, links: draft.links.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, links: [...draft.links, { label: "", url: "" }] })}><Plus className="size-4" /> Agregar enlace</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
