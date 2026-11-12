import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, Copy, ExternalLink, Search, Trash2, Upload } from "lucide-react";

import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { Button } from "@/components/ui/button";

const q = {
  queryKey: ["chattigo_responses"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("chattigo_responses").select("*").order("campaign").order("position");
    if (error) throw error;
    return data ?? [];
  },
};

function pick(row: Record<string, unknown>, keys: string[]) {
  const k = Object.keys(row).find((h) => keys.some((x) => h.toLowerCase().includes(x)));
  return k ? String(row[k] ?? "").trim() : "";
}

export function ChattigoResponses() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(q);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const [s, setS] = useState("");
  const [camp, setCamp] = useState("Todas");
  const [busy, setBusy] = useState(false);
  const camps = ["Todas", ...Array.from(new Set(data.map((r) => r.campaign)))];
  const list = useMemo(
    () => data.filter((r) => (camp === "Todas" || r.campaign === camp) && (r.title + r.body).toLowerCase().includes(s.toLowerCase())),
    [data, s, camp],
  );

  async function onFile(file: File, replace: boolean) {
    setBusy(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const rows: { campaign: string; title: string; body: string; position: number; uploaded_by: string | null }[] = [];
      const { data: u } = await supabase.auth.getUser();
      for (const name of wb.SheetNames) {
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name]!, { defval: "" });
        json.forEach((r, i) => {
          const body = pick(r, ["respuesta", "mensaje", "texto", "body", "contenido"]) || String(Object.values(r).at(-1) ?? "").trim();
          if (!body) return;
          rows.push({
            campaign: pick(r, ["campa"]) || (wb.SheetNames.length > 1 ? name : "General"),
            title: pick(r, ["título", "titulo", "nombre", "atajo", "caso", "situaci"]) || `Respuesta ${i + 1}`,
            body,
            position: i,
            uploaded_by: u.user?.id ?? null,
          });
        });
      }
      if (!rows.length) { toast.error("No encontré respuestas en el archivo"); return; }
      if (replace) {
        const campaigns = Array.from(new Set(rows.map((r) => r.campaign)));
        await supabase.from("chattigo_responses").delete().in("campaign", campaigns);
      }
      const { error } = await supabase.from("chattigo_responses").insert(rows);
      if (error) { toast.error("No se pudo cargar el archivo"); return; }
      toast.success(`${rows.length} respuestas cargadas`);
      qc.invalidateQueries({ queryKey: ["chattigo_responses"] });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("chattigo_responses").delete().eq("id", id);
    if (error) { toast.error("No se pudo eliminar"); return; }
    qc.invalidateQueries({ queryKey: ["chattigo_responses"] });
  }

  return (
    <div className="space-y-5">
      <div className="surface flex flex-wrap items-center gap-2 p-4">
        <p className="mr-auto text-sm">
          <span className="font-semibold">Campañas de Chattigo.</span>{" "}
          <span className="text-muted-foreground">Buscá la respuesta y copiala con un clic.</span>
        </p>
        <Button asChild size="sm">
          <a href="https://chattigo.sabionet.com/" target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" /> Abrir Chattigo
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/article/$slug" params={{ slug: "chattigo" }}>
            <BookOpen className="size-4" /> Manual de uso
          </Link>
        </Button>
      </div>
      {editor && (

        <div className="surface p-4">
          <p className="text-sm font-semibold">Cargar respuestas desde Excel</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Columnas sugeridas: Campaña, Título, Respuesta. Si el archivo tiene varias hojas, cada hoja se toma como una campaña. Al cargar, se reemplazan las respuestas de esas campañas.
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            <Upload className="size-4" /> {busy ? "Cargando…" : "Subir Excel"}
            <input type="file" accept=".xlsx,.xls,.csv" hidden disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, true); e.target.value = ""; }} />
          </label>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={s} onChange={(e) => setS(e.target.value)} placeholder="Buscar respuesta de campaña…" className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3" />
      </div>
      <div className="flex flex-wrap gap-2">
        {camps.map((x) => (
          <button key={x} onClick={() => setCamp(x)} className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${camp === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/60 text-muted-foreground"}`}>{x}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{data.length ? "Sin resultados." : "Todavía no hay respuestas de campañas cargadas."}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <article key={r.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{r.campaign}</p>
              <h2 className="mt-1 font-medium">{r.title}</h2>
              <p className="mt-2 flex-1 whitespace-pre-line text-sm text-muted-foreground">{r.body}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(r.body); toast.success("Mensaje copiado al portapapeles"); }}>
                  <Copy className="size-4" /> Copiar mensaje
                </Button>
                {editor && (
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label="Eliminar"><Trash2 className="size-4" /></Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
