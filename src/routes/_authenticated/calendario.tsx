import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { syncVacationsFromDrive } from "@/lib/vacations.functions";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { MONTHS, staffDirectoryQuery } from "@/lib/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { announcementFromEvent, fmtTime, validateEvent } from "@/lib/calendar-events";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario y Vacaciones — Mansilla Garzón & Asoc." },
      { name: "description", content: "Almanaque del estudio con feriados, cumpleaños del equipo y vacaciones de los gestores." },
      { property: "og:title", content: "Calendario y Vacaciones" },
      { property: "og:description", content: "Feriados, cumpleaños y cronograma de vacaciones del estudio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  component: Calendario,
});

// Feriados nacionales (fechas nominales; los trasladables pueden moverse por decreto)
const HOLIDAYS: Record<string, string> = {
  "2026-01-01": "Año Nuevo", "2026-02-16": "Carnaval", "2026-02-17": "Carnaval",
  "2026-03-24": "Día de la Memoria", "2026-04-02": "Malvinas", "2026-04-03": "Viernes Santo",
  "2026-05-01": "Día del Trabajador", "2026-05-25": "Revolución de Mayo", "2026-06-17": "Paso a la Inmortalidad de Güemes",
  "2026-06-20": "Día de la Bandera", "2026-07-09": "Día de la Independencia", "2026-08-17": "San Martín",
  "2026-10-12": "Diversidad Cultural", "2026-11-20": "Soberanía Nacional", "2026-12-08": "Inmaculada Concepción",
  "2026-12-25": "Navidad",
  "2027-01-01": "Año Nuevo", "2027-02-08": "Carnaval", "2027-02-09": "Carnaval",
  "2027-03-24": "Día de la Memoria", "2027-03-26": "Viernes Santo", "2027-04-02": "Malvinas",
  "2027-05-01": "Día del Trabajador", "2027-05-25": "Revolución de Mayo", "2027-06-17": "Paso a la Inmortalidad de Güemes",
  "2027-06-20": "Día de la Bandera", "2027-07-09": "Día de la Independencia", "2027-08-17": "San Martín",
  "2027-10-12": "Diversidad Cultural", "2027-11-20": "Soberanía Nacional", "2027-12-08": "Inmaculada Concepción",
  "2027-12-25": "Navidad",
};

type Vac = { id: string; person_name: string; start_date: string; end_date: string; status: string; note: string | null; priority: string | null; team: string | null };

const vacQuery = {
  queryKey: ["vacations"] as const,
  queryFn: async (): Promise<Vac[]> => {
    const { data, error } = await supabase.from("vacations").select("id, person_name, start_date, end_date, status, note, priority, team").order("start_date");
    if (error) throw error;
    return (data ?? []) as Vac[];
  },
};

type CalEvent = { id: string; event_date: string; end_date: string | null; start_time: string | null; title: string; kind: string; note: string | null; announcement_id: string | null };
const KINDS = [
  { v: "reunion", l: "Reunión", i: "👥" },
  { v: "capacitacion", l: "Capacitación", i: "🎓" },
  { v: "cierre", l: "Cierre", i: "📊" },
  { v: "social", l: "Evento social", i: "🥂" },
  { v: "feriado", l: "Feriado", i: "🇦🇷" },
  { v: "cumpleanos", l: "Cumpleaños", i: "🎂" },
  { v: "otro", l: "Otro", i: "📌" },
] as const;
const KIND_ICON: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.v, k.i]));
const eventsQuery = {
  queryKey: ["calendar_events"] as const,
  queryFn: async (): Promise<CalEvent[]> => {
    const { data, error } = await supabase.from("calendar_events").select("id, event_date, end_date, start_time, title, kind, note, announcement_id").order("event_date");
    if (error) throw error;
    return (data ?? []) as CalEvent[];
  },
};
const when = (e: CalEvent) =>
  `${e.start_time ? `${fmtTime(e.start_time)} hs` : ""}${e.end_date && e.end_date !== e.event_date ? `${e.start_time ? " · " : ""}hasta ${fmt(e.end_date)}` : ""}`;

async function removeEvent(e: CalEvent) {
  if (e.announcement_id) {
    const { error } = await supabase.from("announcements").delete().eq("id", e.announcement_id);
    if (error) return error;
  }
  const { error } = await supabase.from("calendar_events").delete().eq("id", e.id);
  return error;
}

function EventForm({ initial, onDone }: { initial?: Partial<CalEvent> | undefined; onDone: () => void }) {
  const [f, setF] = useState({
    event_date: initial?.event_date ?? "",
    end_date: initial?.end_date ?? "",
    start_time: fmtTime(initial?.start_time),
    title: initial?.title ?? "",
    kind: initial?.kind ?? "reunion",
    note: initial?.note ?? "",
  });
  const [publish, setPublish] = useState(!!initial?.announcement_id);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const row = { ...f, title: f.title.trim(), note: f.note.trim() || null, end_date: f.end_date || null, start_time: f.start_time || null };
    const err = validateEvent(row);
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      let annId = initial?.announcement_id ?? null;
      const ann = announcementFromEvent(row);
      if (publish && annId) {
        const { error } = await supabase.from("announcements").update({ title: ann.title, body: ann.body }).eq("id", annId);
        if (error) throw error;
      } else if (publish && !annId) {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user!.id;
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
        const { data, error } = await supabase.from("announcements")
          .insert({ ...ann, author_id: uid, author_name: p?.full_name ?? null }).select("id").single();
        if (error) throw error;
        annId = data.id;
      } else if (!publish && annId) {
        const { error } = await supabase.from("announcements").delete().eq("id", annId);
        if (error) throw error;
        annId = null;
      }
      const full = { ...row, announcement_id: annId };
      const { error } = initial?.id
        ? await supabase.from("calendar_events").update(full).eq("id", initial.id)
        : await supabase.from("calendar_events").insert(full);
      if (error) throw error;
      toast.success(initial?.id ? "Evento actualizado" : "Evento agregado");
      setF({ event_date: "", end_date: "", start_time: "", title: "", kind: "reunion", note: "" });
      setPublish(false);
      qcRef?.invalidateQueries({ queryKey: ["announcements"] });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el evento");
    } finally { setBusy(false); }
  };
  const qcRef = useQueryClient();
  const lbl = "flex flex-col gap-1 text-xs text-muted-foreground";
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="event-form-title">
      <h2 id="event-form-title" className="mb-3 font-display text-xl">{initial?.id ? "Editar evento" : "Agregar evento"}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={lbl}>Fecha *<Input type="date" required value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} aria-label="Fecha de inicio" /></label>
        <label className={lbl}>Fecha de fin (opcional)<Input type="date" min={f.event_date || undefined} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} aria-label="Fecha de fin" /></label>
        <label className={lbl}>Hora (opcional)<Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} aria-label="Hora de inicio" /></label>
        <label className={lbl}>Tipo
          <select
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tipo de evento"
          >
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.i} {k.l}</option>)}
          </select>
        </label>
        <label className={lbl}>Título *<Input placeholder="Ej. Reunión de equipo" value={f.title} maxLength={150} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Título del evento" /></label>
        <label className={lbl}>Nota (opcional)<Input placeholder="Lugar, link o detalle" value={f.note} maxLength={500} onChange={(e) => setF({ ...f, note: e.target.value })} aria-label="Nota del evento" /></label>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm">
        <Switch checked={publish} onCheckedChange={setPublish} aria-label="Publicar como novedad en el Inicio" />
        Publicar como novedad en el Inicio
      </label>
      <div className="mt-3 flex gap-2">
        <Button onClick={save} disabled={busy}><Plus className="h-4 w-4" /> {initial?.id ? "Guardar cambios" : "Agregar"}</Button>
        {initial?.id && <Button variant="ghost" onClick={onDone}>Cancelar</Button>}
      </div>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fmt = (s: string) => s.split("-").reverse().join("/");
const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toIso(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return iso(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? iso(d.y, d.m - 1, d.d) : null; }
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (m) { const [, dd = "1", mm = "1", yy = "0"] = m; const y = yy.length === 2 ? 2000 + +yy : +yy; return iso(y, +mm - 1, +dd); }
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

function Calendario() {
  const qc = useQueryClient();
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const { data: vacs = [] } = useQuery(vacQuery);
  const { data: staff = [] } = useQuery(staffDirectoryQuery);
  const now = new Date();
  const { fecha } = Route.useSearch();
  const [y, setY] = useState(fecha ? +fecha.slice(0, 4) : now.getFullYear());
  const [m, setM] = useState(fecha ? +fecha.slice(5, 7) - 1 : now.getMonth());
  const [sel, setSel] = useState<string | null>(fecha ?? null);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  useEffect(() => {
    if (!fecha) return;
    setY(+fecha.slice(0, 4));
    setM(+fecha.slice(5, 7) - 1);
    setSel(fecha);
  }, [fecha]);
  const { data: customEvents = [] } = useQuery(eventsQuery);

  const days = useMemo(() => {
    const first = (new Date(y, m, 1).getDay() + 6) % 7;
    const n = new Date(y, m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
  }, [y, m]);

  const eventsFor = (d: number) => {
    const key = iso(y, m, d);
    return {
      key,
      holiday: HOLIDAYS[key],
      bdays: staff.filter((s) => s.birth_day === d && s.birth_month === m + 1).map((s) => s.nickname || s.full_name),
      vac: vacs.filter((v) => v.start_date <= key && v.end_date >= key),
      custom: customEvents.filter((e) => e.event_date <= key && (e.end_date ?? e.event_date) >= key),
    };
  };

  const move = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setY(d.getFullYear()); setM(d.getMonth()); setSel(null);
  };

  const selEv = sel ? eventsFor(+sel.slice(8)) : null;
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Equipo</p>
        <h1 className="font-display text-3xl">Calendario y Vacaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Feriados, cumpleaños del equipo y vacaciones de los gestores. {editor ? "Como Admin/Senior podés cargar y editar vacaciones abajo." : "Vista de consulta."}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="min-w-44 text-center font-display text-xl">{MONTHS[m]} {y}</h2>
            <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { setY(now.getFullYear()); setM(now.getMonth()); }}>Hoy</Button>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>🇦🇷 Feriado</span><span>🎂 Cumpleaños</span><span>🏖️ Vacaciones</span><span>👥 Reunión</span><span>📌 Otro</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
          {WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={i} />;
            const ev = eventsFor(d);
            return (
              <button
                key={i}
                onClick={() => setSel(ev.key)}
                className={cn(
                  "flex min-h-16 flex-col items-start rounded-md border p-1 text-left text-xs transition-colors hover:bg-secondary sm:min-h-24 sm:p-1.5",
                  ev.holiday ? "border-destructive/40 bg-destructive/5" : "border-border",
                  ev.key === today && "ring-2 ring-primary",
                  sel === ev.key && "bg-secondary",
                )}
              >
                <span className="font-semibold">{d}</span>
                <span className="mt-0.5 flex flex-wrap gap-0.5 leading-none">
                  {ev.holiday && <span title={ev.holiday}>🇦🇷</span>}
                  {ev.bdays.length > 0 && <span title={ev.bdays.join(", ")}>🎂</span>}
                  {ev.vac.length > 0 && <span title={ev.vac.map((v) => v.person_name).join(", ")}>🏖️{ev.vac.length > 1 ? ev.vac.length : ""}</span>}
                  {ev.custom.map((e) => <span key={e.id} title={e.title}>{KIND_ICON[e.kind] ?? "📌"}</span>)}
                </span>
                <span className="mt-auto hidden w-full truncate text-[10px] text-muted-foreground sm:block">
                  {ev.holiday ?? ev.custom[0]?.title ?? ev.bdays[0] ?? ev.vac[0]?.person_name ?? ""}
                </span>
              </button>
            );
          })}
        </div>
        {selEv && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-semibold">{fmt(selEv.key)}</p>
            {!selEv.holiday && !selEv.bdays.length && !selEv.vac.length && !selEv.custom.length && <p className="text-muted-foreground">Sin eventos.</p>}
            {selEv.holiday && <p>🇦🇷 {selEv.holiday}</p>}
            {selEv.bdays.map((b) => <p key={b}>🎂 Cumpleaños de {b}</p>)}
            {selEv.vac.map((v) => <p key={v.id}>🏖️ {v.person_name} ({fmt(v.start_date)} – {fmt(v.end_date)}){v.note ? ` · ${v.note}` : ""}</p>)}
            {selEv.custom.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <p>{KIND_ICON[e.kind] ?? "📌"} {e.title}{when(e) ? ` · ${when(e)}` : ""}{e.note ? ` · ${e.note}` : ""}</p>
                {editor && (
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" aria-label="Editar evento" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label="Eliminar evento" onClick={async () => {
                      if (!confirm(`¿Eliminar «${e.title}»?`)) return;
                      const error = await removeEvent(e);
                      if (error) { toast.error(error.message); return; }
                      toast.success("Evento eliminado");
                      qc.invalidateQueries({ queryKey: ["calendar_events"] });
                      qc.invalidateQueries({ queryKey: ["announcements"] });
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {editor && (
        <EventForm
          key={editing?.id ?? (sel ? `new-${sel}` : "new")}
          initial={editing ?? (sel ? { event_date: sel } : undefined)}
          onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["calendar_events"] }); }}
        />
      )}

      {editor && <VacationAdmin onChange={() => qc.invalidateQueries({ queryKey: ["vacations"] })} />}

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 font-display text-xl">Cronograma de vacaciones</h2>
        {vacs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay vacaciones cargadas.</p>
        ) : (
          <div className="divide-y divide-border">
            {vacs.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium">🏖️ {v.person_name}{v.team ? <span className="ml-2 rounded border px-1.5 text-xs text-muted-foreground">{v.team}</span> : null}</p>
                  <p className="text-muted-foreground">{fmt(v.start_date)} – {fmt(v.end_date)} · {v.status}{v.priority ? ` · Prioridad: ${v.priority}` : ""}</p>
                  {v.note && <p className="text-xs text-muted-foreground">{v.note}</p>}
                </div>
                {editor && (
                  <Button variant="ghost" size="sm" onClick={async () => {
                    const { error } = await supabase.from("vacations").delete().eq("id", v.id);
                    if (error) { toast.error(error.message); return; }
                    toast.success("Eliminado");
                    qc.invalidateQueries({ queryKey: ["vacations"] });
                  }}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VacationAdmin({ onChange }: { onChange: () => void }) {
  const [f, setF] = useState({ person_name: "", start_date: "", end_date: "", status: "aprobada", priority: "", note: "" });
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const sync = useServerFn(syncVacationsFromDrive);
  const [syncing, setSyncing] = useState(false);
  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await sync();
      toast.success(`Sincronizado: ${r.loaded} períodos cargados${r.pending ? ` · ${r.pending} gestores sin fecha todavía` : ""}`);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo sincronizar");
    } finally { setSyncing(false); }
  };

  const add = async () => {
    if (!f.person_name || !f.start_date || !f.end_date) { toast.error("Completá nombre y fechas"); return; }
    if (f.end_date < f.start_date) { toast.error("La fecha final es anterior a la inicial"); return; }
    const { error } = await supabase.from("vacations").insert({ ...f, priority: f.priority || null, note: f.note || null });
    if (error) { toast.error(error.message); return; }
    if (/aprob/i.test(f.status)) {
      const fmt = (d: string) => d.split("-").reverse().join("/");
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      const { error: aErr } = await supabase.from("announcements").insert({
        title: `🏖️ Vacaciones de ${f.person_name}`,
        body: `${f.person_name} estará de licencia del ${fmt(f.start_date)} al ${fmt(f.end_date)}.\n\n¡Que disfrutes mucho tus vacaciones y descanses! ☀️✈️`,
        level: "info", author_id: uid, author_name: p?.full_name ?? null,
      });
      if (aErr) toast.error("Vacaciones cargadas, pero no se pudo publicar la novedad");
      else qc.invalidateQueries({ queryKey: ["announcements"] });
    }
    toast.success("Vacaciones cargadas");
    setF({ ...f, person_name: "", start_date: "", end_date: "", note: "", priority: "" });
    onChange();
  };

  const upload = async (file: File) => {
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
    const rows: Vac[] = [];
    for (const name of wb.SheetNames) {
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name]!, { defval: "" });
      for (const r of data) {
        const get = (...keys: string[]) => {
          const k = Object.keys(r).find((c) => keys.some((x) => c.toLowerCase().includes(x)));
          return k ? r[k] : "";
        };
        const person = String(get("gestor", "nombre", "apellido", "empleado") || "").trim();
        const s = toIso(get("desde", "inicio", "salida", "comienzo"));
        const e = toIso(get("hasta", "fin", "regreso", "vuelta")) ?? s;
        if (!person || !s || !e) continue;
        rows.push({ id: "", person_name: person, start_date: s, end_date: e, status: String(get("estado") || "aprobada"), note: String(get("nota", "observ", "aclara") || "") || null, priority: String(get("prioridad") || "") || null, team: null });
      }
    }
    if (!rows.length) { toast.error("No encontré filas con Gestor, Desde y Hasta"); return; }
    if (!confirm(`Se reemplazará el cronograma con ${rows.length} registros. ¿Continuar?`)) return;
    const del = await supabase.from("vacations").delete().not("id", "is", null);
    if (del.error) { toast.error(del.error.message); return; }
    const { error } = await supabase.from("vacations").insert(rows.map(({ id: _id, ...r }) => r));
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} períodos cargados`);
    onChange();
  };

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm sm:p-6">
      <h2 className="font-display text-xl">Gestión de vacaciones</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        «Sincronizar con Drive» lee directamente la planilla <b>VACACIONES 2027</b> y actualiza el calendario (reemplaza solo lo que vino de Drive; lo cargado a mano se mantiene). También podés subir un Excel con columnas Gestor, Desde, Hasta (reemplaza todo) o cargar un período a mano.
      </p>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x); e.target.value = ""; }} />
      <div className="mb-5 flex flex-wrap gap-2">
        <Button onClick={doSync} disabled={syncing}><RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />{syncing ? "Sincronizando…" : "Sincronizar con Drive (VACACIONES 2027)"}</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Subir Excel manualmente</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input placeholder="Gestor" value={f.person_name} onChange={(e) => setF({ ...f, person_name: e.target.value })} />
        <label className="text-xs text-muted-foreground">Desde<Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">Hasta<Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></label>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="aprobada">Aprobada</option><option value="solicitada">Solicitada</option>
        </select>
        <Input placeholder="Prioridad (opcional)" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} />
        <Input placeholder="Nota / aclaración" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </div>
      <Button variant="outline" className="mt-3" onClick={add}><Plus className="mr-2 h-4 w-4" />Agregar período</Button>
    </section>
  );
}
