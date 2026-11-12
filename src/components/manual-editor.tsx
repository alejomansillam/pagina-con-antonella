import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { saveContent } from "@/lib/editable-content";
import type { QuizQuestion } from "@/lib/manual-quiz";

const field = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

export function ManualEditor({ article, quiz }: { article: { id: string; slug: string; title: string; summary: string; body: string }; quiz: QuizQuestion[] }) {
  const qc = useQueryClient();
  const { data: roles = [] } = useQuery(myRolesQuery);
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(article);
  const [q, setQ] = useState<QuizQuestion[]>(quiz);
  if (!canEdit(roles)) return null;
  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => { setA(article); setQ(quiz.map((x) => ({ ...x, options: [...x.options] }))); setOpen(true); }}>
        <Pencil className="size-4" /> Editar manual y quiz
      </Button>
    );
  const upd = (i: number, p: Partial<QuizQuestion>) => setQ((x) => x.map((y, j) => (j === i ? { ...y, ...p } : y)));
  const save = async () => {
    if (!a.title.trim() || !a.body.trim()) { toast.error("El título y el contenido son obligatorios"); return; }
    const clean = q.filter((x) => x.q.trim() && x.options.filter((o) => o.trim()).length >= 2);
    const { error } = await supabase.from("articles").update({ title: a.title.trim(), summary: a.summary.trim(), body: a.body, updated_at: new Date().toISOString() }).eq("id", article.id);
    if (error) { toast.error("No se pudo guardar el manual"); return; }
    try { await saveContent(`quiz:${article.slug}`, `Quiz ${a.title}`, clean); } catch { toast.error("No se pudo guardar el quiz"); return; }
    toast.success("Manual actualizado");
    qc.invalidateQueries({ queryKey: ["articles"] });
    qc.invalidateQueries({ queryKey: ["editable_content", `quiz:${article.slug}`] });
    setOpen(false);
  };
  return (
    <section className="surface mt-6 space-y-3 p-5">
      <h2 className="font-display text-xl">Editar manual</h2>
      <label className="block text-sm font-medium">Título<input className={field} value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} /></label>
      <label className="block text-sm font-medium">Resumen<input className={field} value={a.summary} onChange={(e) => setA({ ...a, summary: e.target.value })} /></label>
      <label className="block text-sm font-medium">Contenido (admite títulos con ## y listas con -)<textarea rows={14} className={field} value={a.body} onChange={(e) => setA({ ...a, body: e.target.value })} /></label>
      <h3 className="pt-2 font-display text-lg">Quiz</h3>
      {q.map((x, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="flex gap-2">
            <input aria-label="Pregunta" className={field} value={x.q} placeholder="Pregunta" onChange={(e) => upd(i, { q: e.target.value })} />
            <Button size="icon" variant="ghost" aria-label="Borrar pregunta" onClick={() => setQ((y) => y.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
          </div>
          {x.options.map((o, k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="radio" name={`ans-${i}`} checked={x.answer === k} onChange={() => upd(i, { answer: k })} aria-label={`Opción ${k + 1} es la correcta`} />
              <input className={field} value={o} placeholder={`Opción ${k + 1}`} onChange={(e) => upd(i, { options: x.options.map((z, m) => (m === k ? e.target.value : z)) })} />
            </label>
          ))}
          <input aria-label="Explicación" className={field} value={x.why} placeholder="Por qué es la correcta" onChange={(e) => upd(i, { why: e.target.value })} />
          <p className="text-xs text-muted-foreground">Marcá el círculo de la respuesta correcta.</p>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setQ((y) => [...y, { q: "", options: ["", "", "", ""], answer: 0, why: "" }])}><Plus className="size-4" /> Agregar pregunta</Button>
        <Button size="sm" onClick={save}>Guardar</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </section>
  );
}
