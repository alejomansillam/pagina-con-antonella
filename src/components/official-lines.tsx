import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { contentQuery, saveContent } from "@/lib/editable-content";

const copy = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado al portapapeles`);
};

type Line = { kind: "wa" | "fijo"; label: string; number: string; chat?: boolean };

const DEFAULT: Line[] = [
  { kind: "wa", label: "WhatsApp API", number: "3518002881" },
  { kind: "wa", label: "WhatsApp Bircle", number: "3513280429" },
  { kind: "wa", label: "WhatsApp Chattigo", number: "3517685032", chat: true },
  { kind: "fijo", label: "Teléfono fijo", number: "(351) 568-4731" },
  { kind: "fijo", label: "Teléfono fijo", number: "(0351) 423-9257" },
];

const digits = (n: string) => n.replace(/\D/g, "").replace(/^0/, "");
const KEY = "lineas-oficiales";

export function OfficialLines() {
  const qc = useQueryClient();
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const { data: saved } = useQuery(contentQuery<Line[]>(KEY));
  const lines = saved?.length ? saved : DEFAULT;
  const [draft, setDraft] = useState<Line[] | null>(null);

  const save = async () => {
    if (!draft) return;
    const clean = draft.filter((l) => l.label.trim() && l.number.trim());
    try {
      await saveContent(KEY, "Líneas oficiales del estudio", clean);
      toast.success("Líneas actualizadas");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["editable_content", KEY] });
    } catch {
      toast.error("No se pudo guardar");
    }
  };

  const upd = (i: number, p: Partial<Line>) => setDraft((d) => d!.map((l, j) => (j === i ? { ...l, ...p } : l)));

  const group = (kind: Line["kind"]) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {kind === "wa" ? <MessageCircle className="size-4" aria-hidden /> : <Phone className="size-4" aria-hidden />}
        {kind === "wa" ? "Líneas de WhatsApp" : "Teléfonos fijos"}
      </p>
      <ul className="mt-3 space-y-3">
        {lines.filter((l) => l.kind === kind).map((l, i) => (
          <li key={l.number + i} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{l.label}</p>
              <p className="font-mono text-sm">{l.number}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => copy(l.number, l.label)}>
                <Copy className="size-3.5" /> Copiar
              </Button>
              {kind === "fijo" ? (
                <Button asChild size="sm" variant="outline"><a href={`tel:+54${digits(l.number)}`}>Llamar</a></Button>
              ) : l.chat ? (
                <Button asChild size="sm" variant="outline">
                  <a href={`https://wa.me/${digits(l.number)}`} target="_blank" rel="noreferrer noopener">Abrir chat</a>
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Phone className="size-5 text-primary" aria-hidden /> Líneas oficiales del estudio
        </h2>
        {editor && !draft && (
          <Button size="sm" variant="outline" onClick={() => setDraft(lines.map((l) => ({ ...l })))}>
            <Pencil className="size-4" /> Editar
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Usá siempre estos canales oficiales para comunicarte con clientes. Copiá el número con un clic.
      </p>

      {draft ? (
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-paper p-3">
          {draft.map((l, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto_auto] sm:items-center">
              <select aria-label="Tipo" value={l.kind} onChange={(e) => upd(i, { kind: e.target.value as Line["kind"] })} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                <option value="wa">WhatsApp</option>
                <option value="fijo">Fijo</option>
              </select>
              <input aria-label="Nombre" value={l.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Nombre" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <input aria-label="Número" value={l.number} onChange={(e) => upd(i, { number: e.target.value })} placeholder="Número" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={!!l.chat} disabled={l.kind !== "wa"} onChange={(e) => upd(i, { chat: e.target.checked })} /> Abrir chat
              </label>
              <Button size="icon" variant="ghost" aria-label="Quitar línea" onClick={() => setDraft((d) => d!.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setDraft((d) => [...d!, { kind: "wa", label: "", number: "" }])}>
              <Plus className="size-4" /> Agregar línea
            </Button>
            <Button size="sm" onClick={save}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {group("wa")}
          {group("fijo")}
        </div>
      )}
    </section>
  );
}
