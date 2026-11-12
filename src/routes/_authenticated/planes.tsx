import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { OpsConfirm, parseOps, type OpsParsed } from "@/components/mi-gestion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planes")({
  head: () => ({
    meta: [
      { title: "Seguimiento de Planes de Pago — Mansilla Garzón & Asoc." },
      { name: "description", content: "Planes de pago por gestor y padrón: vencidos, próximos y al día." },
      { property: "og:title", content: "Seguimiento de Planes de Pago" },
      { property: "og:description", content: "Planes pendientes, vencimientos y cuotas impagas por gestor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Planes,
});

type Acc = {
  id: number; dni: string; nombre: string | null; cuenta: string | null; padron: string | null; responsable: string | null;
  deuda: number | null; saldo_vencido: number | null; cuotas: number | null; cuotas_pagas: number | null; cuotas_restantes: number | null;
  dias_sin_pago: number | null; ultimo_pago: string | null; ultimo_llamado: string | null; situacion: string | null; proxima_gestion: string | null;
  refi_estado: string | null; refi_fecha: string | null; refi_vencimiento: string | null; refi_monto_cuota: number | null; refi_cuotas: number | null; refi_dias_sin_pago: number | null;
};
type Pend = { id: number; dni: string | null; nombre: string | null; fecha: string | null; monto: number | null; responsable: string | null };
type Est = "vencido" | "proximo" | "ok" | "fin";
const EST_LABEL: Record<Est, string> = { vencido: "Vencido", proximo: "Próximo a vencer", ok: "Al día", fin: "Finalizado" };
const EST_CLASS: Record<Est, string> = {
  vencido: "bg-destructive/15 text-destructive border-destructive/30",
  proximo: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  ok: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  fin: "bg-muted text-muted-foreground border-border",
};
const RANK: Record<Est, number> = { vencido: 0, proximo: 1, ok: 2, fin: 3 };

const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); };
const daysTo = (d: string | null) => (d ? Math.round((new Date(d + "T00:00:00").getTime() - today()) / 86400000) : null);
const total = (a: Acc) => a.refi_cuotas ?? a.cuotas;
const pagas = (a: Acc) => a.cuotas_pagas;
const faltan = (a: Acc) => a.cuotas_restantes ?? (total(a) != null && pagas(a) != null ? Math.max(0, total(a)! - pagas(a)!) : null);
const sinPago = (a: Acc) => a.refi_dias_sin_pago ?? a.dias_sin_pago;
function estado(a: Acc): Est {
  const f = faltan(a);
  if ((f === 0 && total(a)) || /finaliz|cancel|pagad/i.test(a.refi_estado ?? "")) return "fin";
  const dsp = sinPago(a) ?? 0;
  const dv = daysTo(a.refi_vencimiento);
  if (dsp >= 30 || /caid|atras|incumpl|vencid/i.test(a.refi_estado ?? "") || (dv != null && dv < 0)) return "vencido";
  if ((dv != null && dv <= 5) || dsp > 0) return "proximo";
  return "ok";
}
const padronOf = (a: Acc) => { const m = (a.padron ?? "").match(/N\s*([123])/i) ?? (a.padron ?? "").match(/^([123])$/); return m ? `N${m[1]}` : "Sin padrón"; };
const money = (n: number | null) => (n == null ? "—" : n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }));
const fd = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const fdt = (d: string) => new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function fetchAll<T>(q: (f: number, t: number) => PromiseLike<{ data: unknown; error: unknown }>) {
  const out: T[] = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await q(f, f + 999);
    if (error) throw error;
    out.push(...((data as T[]) ?? []));
    if (!data || (data as T[]).length < 1000) break;
  }
  return out;
}

function Planes() {
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [ops, setOps] = useState<OpsParsed | null>(null);
  const [q, setQ] = useState("");
  const [pad, setPad] = useState("todos");
  const [est, setEst] = useState<Est | "todos">("todos");
  const [gest, setGest] = useState("todos");
  const [openG, setOpenG] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Acc | null>(null);
  const [help, setHelp] = useState(false);

  const { data: up } = useQuery({
    queryKey: ["dash_upload"],
    queryFn: async () => {
      const { data } = await supabase.from("dash_uploads").select("id, file_name, uploaded_at").eq("status", "ok").order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  const { data: accs = [], isLoading } = useQuery({
    queryKey: ["planes_acc", up?.id], enabled: !!up,
    queryFn: () => fetchAll<Acc>((f, t) => supabase.from("dash_accounts").select("*").eq("upload_id", up!.id).range(f, t) as never),
  });
  const { data: pend = [] } = useQuery({
    queryKey: ["planes_pend", up?.id], enabled: !!up,
    queryFn: () => fetchAll<Pend>((f, t) => supabase.from("dash_pending").select("*").eq("upload_id", up!.id).range(f, t) as never),
  });

  const plans = useMemo(() => accs.filter((a) => a.refi_estado || a.refi_fecha || a.refi_cuotas || a.cuotas), [accs]);
  const gestores = useMemo(() => Array.from(new Set(plans.map((a) => a.responsable?.trim() || "Sin gestor"))).sort(), [plans]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const dg = t.replace(/\D/g, "");
    return plans.filter((a) => {
      if (pad !== "todos" && padronOf(a) !== pad) return false;
      if (est !== "todos" && estado(a) !== est) return false;
      if (gest !== "todos" && (a.responsable?.trim() || "Sin gestor") !== gest) return false;
      if (!t) return true;
      return (a.nombre ?? "").toLowerCase().includes(t) || (dg.length >= 3 && a.dni.includes(dg)) || (a.cuenta ?? "").toLowerCase().includes(t);
    });
  }, [plans, q, pad, est, gest]);

  const kpi = useMemo(() => {
    const c = { vencido: 0, proximo: 0, ok: 0, fin: 0 };
    for (const a of filtered) c[estado(a)]++;
    return { pend: c.vencido + c.proximo + c.ok, ...c };
  }, [filtered]);

  const tree = useMemo(() => {
    const g = new Map<string, Map<string, Acc[]>>();
    for (const a of filtered) {
      const k = a.responsable?.trim() || "Sin gestor";
      if (!g.has(k)) g.set(k, new Map());
      const p = g.get(k)!;
      const pk = padronOf(a);
      if (!p.has(pk)) p.set(pk, []);
      p.get(pk)!.push(a);
    }
    for (const p of g.values()) for (const list of p.values())
      list.sort((x, y) => RANK[estado(x)] - RANK[estado(y)] || (sinPago(y) ?? 0) - (sinPago(x) ?? 0) || (daysTo(x.refi_vencimiento) ?? 9e9) - (daysTo(y.refi_vencimiento) ?? 9e9));
    return Array.from(g.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const onFile = async (f: File) => {
    try {
      setStage("Leyendo archivo...");
      const buf = await f.arrayBuffer();
      setStage("Analizando información...");
      await new Promise((r) => setTimeout(r, 30));
      const wb = XLSX.read(buf, { cellDates: true });
      setStage("Preparando actualización...");
      setOps(parseOps(wb, f.name));
    } catch {
      toast.error("No se pudo actualizar la información. La carga anterior continúa disponible.");
    } finally {
      setStage(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const single = !editor;
  const count = (l: Acc[]) => { let v = 0, p = 0, pe = 0; for (const a of l) { const e = estado(a); if (e === "vencido") v++; if (e === "proximo") p++; if (e !== "fin") pe++; } return { v, p, pe }; };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Operación</p>
          <h1 className="font-serif text-3xl">{single ? "Mis planes de pago" : "Seguimiento de Planes de Pago"}</h1>
          <p className="text-sm text-muted-foreground">Revisá tus planes pendientes, vencimientos y cuotas impagas.</p>
          <p className="text-xs text-muted-foreground">{up ? `Última actualización: ${fdt(up.uploaded_at)}` : "Todavía no se cargó ningún archivo de planes."}</p>
        </div>
        {editor && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Button onClick={() => fileRef.current?.click()} disabled={!!stage}>
              <Upload className="mr-2 h-4 w-4" /> {stage ?? "Cargar / Actualizar Planes (Excel)"}
            </Button>
          </>
        )}
      </header>

      <div>
        <button onClick={() => setHelp(!help)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          {help ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} ¿Cómo funciona?
        </button>
        {help && (
          <ol className="mt-2 grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <li><b>1. Exportá</b> el Excel de Alerta Refinanciaciones.</li>
            <li><b>2. Revisá</b> que tenga las pestañas de GM, refinanciaciones y depósitos pendientes.</li>
            <li><b>3. Cargalo</b> (Seniors/Admin): reemplaza la carga anterior tras confirmar.</li>
            <li><b>4. Mantenelo al día</b>: actualizalo al menos una vez por semana.</li>
          </ol>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Planes pendientes", kpi.pend, ""], ["Planes vencidos", kpi.vencido, "text-destructive"], ["Próximos a vencer", kpi.proximo, "text-amber-600"], ["Planes al día", kpi.ok, "text-emerald-600"]].map(([l, v, c]) => (
          <div key={l as string} className="rounded-xl border bg-card p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{l}</p>
            <p className={cn("mt-1 text-3xl font-semibold", c as string)}>{(v as number).toLocaleString("es-AR")}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, DNI o cuenta…" className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
        </div>
        {editor && (
          <select value={gest} onChange={(e) => setGest(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Gestor">
            <option value="todos">Todos los gestores</option>
            {gestores.map((g) => <option key={g}>{g}</option>)}
          </select>
        )}
        <select value={pad} onChange={(e) => setPad(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Padrón">
          <option value="todos">Padrón: Todos</option><option>N1</option><option>N2</option><option>N3</option>
        </select>
        <select value={est} onChange={(e) => setEst(e.target.value as Est | "todos")} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Estado">
          <option value="todos">Estado: Todos</option>
          {(Object.keys(EST_LABEL) as Est[]).map((k) => <option key={k} value={k}>{EST_LABEL[k]}</option>)}
        </select>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && up && !tree.length && <p className="py-8 text-center text-sm text-muted-foreground">No hay planes que coincidan con el filtro.</p>}

      <div className="space-y-2">
        {tree.map(([g, pads]) => {
          const all = Array.from(pads.values()).flat();
          const c = count(all);
          const open = single || openG[g];
          return (
            <div key={g} className="rounded-xl border bg-card">
              {!single && (
                <button onClick={() => setOpenG({ ...openG, [g]: !open })} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <div>
                    <p className="font-medium uppercase tracking-wide">{g}</p>
                    <p className="text-xs text-muted-foreground">{c.pe} pendientes · <span className="text-destructive">{c.v} vencidos</span> · <span className="text-amber-600">{c.p} próximos</span></p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold">{all.length} {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                </button>
              )}
              {open && (
                <div className={cn("space-y-2 p-3", !single && "border-t")}>
                  {Array.from(pads.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([p, list]) => <PadronBlock key={p} name={p} list={list} onView={setDetail} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pend.length > 0 && (
        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Pagos pendientes de imputación ({pend.length})</summary>
          <ul className="mt-3 divide-y text-sm">
            {pend.slice(0, 200).map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <span>{p.nombre ?? p.dni}<span className="block text-xs text-muted-foreground">{p.responsable ?? ""} · {fd(p.fecha)}</span></span>
                <span className="font-medium">{money(p.monto)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <OpsConfirm parsed={ops} onClose={() => setOps(null)} />

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>{detail?.nombre ?? detail?.dni}</SheetTitle></SheetHeader>
          {detail && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {([
                ["Cliente", detail.nombre], ["DNI", detail.dni], ["Padrón", padronOf(detail)], ["Gestor", detail.responsable],
                ["Estado", EST_LABEL[estado(detail)] + (detail.refi_estado ? ` (${detail.refi_estado})` : "")],
                ["Fecha del plan", fd(detail.refi_fecha)], ["Monto", money(detail.deuda)], ["Monto de cuota", money(detail.refi_monto_cuota)],
                ["Cuotas totales", total(detail)], ["Cuotas pagas", pagas(detail)], ["Cuotas faltantes", faltan(detail)],
                ["Vencimiento", fd(detail.refi_vencimiento)], ["Días sin pago", sinPago(detail)], ["Último pago", fd(detail.ultimo_pago)],
                ["Última gestión", fd(detail.ultimo_llamado)], ["Próxima gestión", detail.proxima_gestion], ["Resultado", detail.situacion],
              ] as [string, unknown][]).map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd>{v == null || v === "" ? "—" : String(v)}</dd></div>
              ))}
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PadronBlock({ name, list, onView }: { name: string; list: Acc[]; onView: (a: Acc) => void }) {
  const [open, setOpen] = useState(false);
  const v = list.filter((a) => estado(a) === "vencido").length;
  return (
    <div className="rounded-lg border">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm">
        <span className="flex items-center gap-1 font-medium">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} {name} — {list.length} planes</span>
        {v > 0 && <span className="text-xs text-destructive">{v} vencidos</span>}
      </button>
      {open && (
        <div className="grid gap-2 border-t p-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.slice(0, 300).map((a) => {
            const e = estado(a);
            return (
              <div key={a.id} className="rounded-md border bg-background p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{a.nombre ?? a.dni}</p>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px]", EST_CLASS[e])}>{EST_LABEL[e]}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{total(a) ?? "—"} cuotas · {pagas(a) ?? "—"} pagas · {faltan(a) ?? "—"} faltantes</p>
                <p className="text-xs">Cuota: {money(a.refi_monto_cuota)} · Vence: {fd(a.refi_vencimiento)}</p>
                <p className="text-xs">Días sin pago: {sinPago(a) ?? "—"}</p>
                <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => onView(a)}>Ver plan</Button>
              </div>
            );
          })}
          {list.length > 300 && <p className="text-xs text-muted-foreground">Mostrando 300 de {list.length}. Usá la búsqueda.</p>}
        </div>
      )}
    </div>
  );
}
