import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type * as XLSXT from "xlsx";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const OPS_SHEETS = ["FORMULAS", "CONSULTA DE GM", "PEGAR ALER REFIN DE CR", "Depo pend impu"] as const;
const FAIL = "No se pudo actualizar el tablero. La información anterior continúa disponible.";

type Acc = {
  dni: string; nombre: string | null; cuenta: string | null; padron: string | null; responsable: string | null; abogado: string | null;
  deuda: number | null; saldo_vencido: number | null; cuotas: number | null; cuotas_pagas: number | null; cuotas_restantes: number | null;
  dias_sin_pago: number | null; ultimo_pago: string | null; ultimo_llamado: string | null; dias_ultimo_llamado: number | null;
  riesgo: string | null; situacion: string | null; proxima_gestion: string | null; pendiente_imputacion: boolean;
  telefono: string | null; email: string | null; localidad: string | null;
  refi_estado: string | null; refi_fecha: string | null; refi_vencimiento: string | null; refi_monto_cuota: number | null; refi_cuotas: number | null; refi_dias_sin_pago: number | null;
};
type Pend = { dni: string | null; nombre: string | null; fecha: string | null; monto: number | null; responsable: string | null; padron: string | null; abogado: string | null; estado: string | null };
type Summary = {
  detected: string[]; missing: string[]; cuentas: number; gestores: number; padrones: number; refis: number; pendientes: number; gestionesPend: number;
  porResponsable: { r: string; cuentas: number; rojo: number; refis: number; pend: number }[];
};
export type OpsParsed = { fileName: string; accounts: Acc[]; pending: Pend[]; summary: Summary };

const nk = (k: string) => k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const s = (v: unknown) => { const t = String(v ?? "").trim(); return !t || /^#N\/?A|#N\/D/i.test(t) ? null : t; };
const n = (v: unknown) => { if (typeof v === "number") return v; const t = s(v); if (!t) return null; const x = Number(t.replace(/[$\s]/g, "").replace(/,/g, "")); return Number.isFinite(x) ? x : null; };
const i = (v: unknown) => { const x = n(v); return x == null ? null : Math.round(x); };
const d = (v: unknown): string | null => {
  let dt: Date | null = null;
  if (v instanceof Date) dt = v;
  else if (typeof v === "number" && v > 20000) dt = new Date(Math.round((v - 25569) * 86400000));
  else { const t = s(v); const m = t?.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/); if (m) dt = new Date(Number(m[3]!.length === 2 ? "20" + m[3] : m[3]), Number(m[2]) - 1, Number(m[1])); }
  if (!dt || isNaN(dt.getTime()) || dt.getFullYear() < 1990) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};
const dniOf = (v: unknown) => { const t = s(v); return t ? t.replace(/\D/g, "").replace(/^0+/, "") || null : null; };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = { [k: string]: any } & { nro_doc?: unknown };
function rows(wb: XLSXT.WorkBook, name: string) {
  const key = Object.keys(wb.Sheets).find((k) => k.trim().toLowerCase() === name.toLowerCase());
  if (!key) return null;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[key]!, { defval: null }).map((r): R => {
    const o: R = {};
    for (const [k, v] of Object.entries(r)) { const kk = nk(k); if (!(kk in o) || o[kk] == null) o[kk] = v; }
    return o;
  });
}

export function alertLevel(a: Acc): "rojo" | "amarillo" | "verde" {
  const sit = `${a.situacion ?? ""} ${a.proxima_gestion ?? ""}`.toLowerCase();
  if ((a.dias_sin_pago ?? 0) >= 30 || /caid|atras|incumpl|vencid/i.test(a.refi_estado ?? "") || /vencid|llamar/.test(sit) || (a.refi_estado && a.cuotas_pagas === 0)) return "rojo";
  if (/enviar|proxim|recordar/.test(sit) || ((a.dias_sin_pago ?? 0) > 0 && (a.dias_sin_pago ?? 0) < 30)) return "amarillo";
  return "verde";
}

export function parseOps(wb: XLSXT.WorkBook, fileName: string): OpsParsed {
  const map = new Map<string, Acc>();
  const get = (dni: string) => {
    let a = map.get(dni);
    if (!a) { a = { dni, nombre: null, cuenta: null, padron: null, responsable: null, abogado: null, deuda: null, saldo_vencido: null, cuotas: null, cuotas_pagas: null, cuotas_restantes: null, dias_sin_pago: null, ultimo_pago: null, ultimo_llamado: null, dias_ultimo_llamado: null, riesgo: null, situacion: null, proxima_gestion: null, pendiente_imputacion: false, telefono: null, email: null, localidad: null, refi_estado: null, refi_fecha: null, refi_vencimiento: null, refi_monto_cuota: null, refi_cuotas: null, refi_dias_sin_pago: null }; map.set(dni, a); }
    return a;
  };
  const set = <K extends keyof Acc>(a: Acc, k: K, v: Acc[K] | null) => { if (v != null) a[k] = v as Acc[K]; };
  const detected: string[] = []; const missing: string[] = [];
  const gm = rows(wb, "CONSULTA DE GM"); const refi = rows(wb, "PEGAR ALER REFIN DE CR"); const fo = rows(wb, "FORMULAS"); const dep = rows(wb, "Depo pend impu");
  [["CONSULTA DE GM", gm], ["PEGAR ALER REFIN DE CR", refi], ["FORMULAS", fo], ["Depo pend impu", dep]].forEach(([k, v]) => (v ? detected : missing).push(k as string));
  if (!gm && !refi && !fo && !dep) throw new Error("El archivo no tiene ninguna de las pestañas esperadas.");

  for (const r of gm ?? []) {
    const dni = dniOf(r["nro_doc"]); if (!dni) continue; const a = get(dni);
    set(a, "nombre", [s(r["apellido"]), s(r["nombre"])].filter(Boolean).join(", ") || null);
    set(a, "cuenta", s(r["cuenta_asociada"])); set(a, "padron", s(r["padron"])); set(a, "responsable", s(r["responsable"])); set(a, "abogado", s(r["abogado"]));
    set(a, "deuda", n(r["deuda"])); set(a, "ultimo_pago", d(r["fecha_ult_pago"])); set(a, "telefono", s(r["telefono_1"]) ?? s(r["telefono_2"])); set(a, "localidad", s(r["dompart_localidad"]));
  }
  for (const r of refi ?? []) {
    const dni = dniOf(r["nrodoc"]); if (!dni) continue; const a = get(dni);
    if (!a.nombre) set(a, "nombre", [s(r["apellido"]), s(r["nombre"])].filter(Boolean).join(", ") || null);
    set(a, "abogado", s(r["abogado"])); set(a, "refi_estado", s(r["estado_refinanciacion"]) ?? "ACTIVA"); set(a, "refi_fecha", d(r["fecha_refinanciacion_ok"]) ?? d(r["fecharefinanciacion"]));
    set(a, "refi_vencimiento", d(r["fec_vto_refi"])); set(a, "refi_monto_cuota", n(r["monto_cuota"])); set(a, "refi_cuotas", i(r["cuotas"])); set(a, "refi_dias_sin_pago", i(r["dias_sin_pago"]));
    set(a, "saldo_vencido", n(r["saldo_cuota_vencida"])); set(a, "dias_sin_pago", i(r["dias_sin_pago"])); set(a, "telefono", a.telefono ?? s(r["tel_particular"]));
  }
  for (const r of fo ?? []) {
    const dni = dniOf(r["dni"]); if (!dni) continue; const a = get(dni);
    if (!a.nombre) set(a, "nombre", s(r["apellido_texto"]) ?? s(r["apellido_cuotero"]));
    set(a, "responsable", s(r["responsable"])); set(a, "padron", a.padron ?? s(r["padron"])); set(a, "abogado", s(r["abogado"]));
    set(a, "saldo_vencido", n(r["saldo_cuota_vencida"])); set(a, "cuotas", i(r["cuotas"])); set(a, "cuotas_pagas", i(r["cuotas_pagas"])); set(a, "cuotas_restantes", i(r["cuotas_restantes"]));
    set(a, "riesgo", s(r["riesgo"])); set(a, "ultimo_llamado", d(r["ultimo_llamado"])); set(a, "dias_sin_pago", i(r["dias_de_no_pago"])); set(a, "ultimo_pago", d(r["ultimo_pago"]) ?? a.ultimo_pago);
    set(a, "email", s(r["e_mail"])); set(a, "telefono", s(r["telefono"])); set(a, "situacion", s(r["mensaje_a_enviar"])); set(a, "proxima_gestion", s(r["envio_mensaje_por_saldo_de"]));
    set(a, "dias_ultimo_llamado", i(r["dias_de_ultimo_llamado"])); if (s(r["pendiente_de_imputacion"])) a.pendiente_imputacion = true;
  }
  const pending: Pend[] = [];
  for (const r of dep ?? []) {
    const dni = dniOf(r["dni"]);
    const p: Pend = { dni, nombre: s(r["nombre"]), fecha: d(r["fecha"]), monto: n(r["monto"]), responsable: s(r["responsable"]), padron: s(r["padron"]), abogado: s(r["abogado"]), estado: "Pendiente de imputación" };
    if (dni) { const a = get(dni); a.pendiente_imputacion = true; if (!p.responsable) p.responsable = a.responsable; if (!a.nombre) a.nombre = p.nombre; }
    pending.push(p);
  }
  const accounts = [...map.values()];
  const by = new Map<string, Summary["porResponsable"][number]>();
  for (const a of accounts) {
    const r = a.responsable ?? "(sin responsable)";
    const x = by.get(r) ?? { r, cuentas: 0, rojo: 0, refis: 0, pend: 0 };
    x.cuentas++; if (alertLevel(a) === "rojo") x.rojo++; if (a.refi_estado) x.refis++; if (a.pendiente_imputacion) x.pend++; by.set(r, x);
  }
  return {
    fileName, accounts, pending,
    summary: {
      detected, missing, cuentas: accounts.length, gestores: [...by.keys()].filter((k) => k !== "(sin responsable)").length,
      padrones: new Set(accounts.map((a) => a.padron).filter(Boolean)).size, refis: accounts.filter((a) => a.refi_estado).length,
      pendientes: pending.length, gestionesPend: accounts.filter((a) => /llamar|enviar/i.test(`${a.situacion ?? ""} ${a.proxima_gestion ?? ""}`)).length,
      porResponsable: [...by.values()].sort((a, b) => b.cuentas - a.cuentas),
    },
  };
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let f = 0; ; f += 1000) { const { data, error } = await build(f, f + 999); if (error) throw error; out.push(...(data ?? [])); if (!data || data.length < 1000) break; }
  return out;
}

const uploadQuery = {
  queryKey: ["dash_upload"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("dash_uploads").select("*").eq("status", "ok").order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data as { id: string; file_name: string; uploaded_at: string; rows_count: number; summary: Summary } | null;
  },
};

const fmtN = (x: number | null | undefined) => (x == null ? "—" : Math.round(x).toLocaleString("es-AR"));
const fmtD = (x: string | null) => (x ? x.split("-").reverse().join("/") : "—");
const fmtDT = (x: string) => { const t = new Date(x); return `${fmtD(t.toISOString().slice(0, 10))} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`; };

export function OpsConfirm({ parsed, onClose }: { parsed: OpsParsed | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [prog, setProg] = useState<string | null>(null);
  async function confirm() {
    if (!parsed) return;
    let newId: string | null = null;
    try {
      setProg("Preparando actualización...");
      const { data: u } = await supabase.auth.getUser();
      const { data: up, error } = await supabase.from("dash_uploads").insert({ file_name: parsed.fileName, uploaded_by: u.user?.id ?? null, rows_count: parsed.accounts.length, summary: parsed.summary as never }).select("id").single();
      if (error) throw error; newId = up.id;
      for (let k = 0; k < parsed.accounts.length; k += 1000) {
        setProg(`Guardando cuentas ${fmtN(Math.min(k + 1000, parsed.accounts.length))} de ${fmtN(parsed.accounts.length)}...`);
        const { error: e } = await supabase.from("dash_accounts").insert(parsed.accounts.slice(k, k + 1000).map((a) => ({ ...a, upload_id: newId! })));
        if (e) throw e;
      }
      for (let k = 0; k < parsed.pending.length; k += 1000) {
        const { error: e } = await supabase.from("dash_pending").insert(parsed.pending.slice(k, k + 1000).map((p) => ({ ...p, upload_id: newId! })));
        if (e) throw e;
      }
      const { error: e2 } = await supabase.from("dash_uploads").update({ status: "ok" }).eq("id", newId);
      if (e2) throw e2;
      await supabase.from("dash_uploads").delete().neq("id", newId);
      toast.success("Tablero actualizado correctamente");
      qc.invalidateQueries({ queryKey: ["dash_upload"] });
      onClose();
    } catch {
      if (newId) await supabase.from("dash_uploads").delete().eq("id", newId);
      toast.error(FAIL);
    } finally { setProg(null); }
  }
  const sm = parsed?.summary;
  return (
    <Dialog open={!!parsed} onOpenChange={(o) => !o && !prog && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Resumen de la carga</DialogTitle></DialogHeader>
        {sm && (
          <div className="space-y-3 text-sm">
            <p><b>{parsed!.fileName}</b> · {fmtDT(new Date().toISOString())}</p>
            <div className="grid grid-cols-2 gap-2">
              {[["Cuentas detectadas", sm.cuentas], ["Gestores / responsables", sm.gestores], ["Padrones", sm.padrones], ["Refinanciaciones", sm.refis], ["Pagos pend. de imputación", sm.pendientes], ["Gestiones pendientes", sm.gestionesPend]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg border bg-secondary/40 p-2"><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg font-semibold tabular-nums">{fmtN(v as number)}</p></div>
              ))}
            </div>
            <p className="text-xs">✓ Pestañas detectadas: {sm.detected.join(", ") || "ninguna"}</p>
            {sm.missing.length > 0 && <p className="text-xs text-muted-foreground">⚠️ No encontradas (se omiten): {sm.missing.join(", ")}</p>}
            {prog && <p className="font-medium">{prog}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={!!prog}>CANCELAR</Button>
          <Button onClick={confirm} disabled={!!prog}>CONFIRMAR CARGA</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TABS = ["Todas", "Prioridad", "Gestión vencida", "Cuota vencida", "Refinanciación", "Pago pendiente"] as const;
const dot = { rojo: "bg-destructive", amarillo: "bg-amber-500", verde: "bg-emerald-500" };

export function OpsBoard({ editor }: { editor: boolean }) {
  const { data: up, isLoading } = useQuery(uploadQuery);
  const { data: myGm } = useQuery({ queryKey: ["my_gm"], queryFn: async () => { const { data } = await supabase.rpc("my_gm_username"); return (data as string | null) ?? null; } });
  const [who, setWho] = useState<string>("");
  useEffect(() => { if (!editor && myGm) setWho(myGm); }, [editor, myGm]);

  const { data: accs = [], isFetching } = useQuery({
    queryKey: ["dash_accounts", up?.id, editor ? who : "mine"],
    enabled: !!up && (!editor || !!who),
    queryFn: () => fetchAll<Acc>((f, t) => { let q = supabase.from("dash_accounts").select("*").eq("upload_id", up!.id); if (editor) q = q.ilike("responsable", who); return q.range(f, t) as never; }),
  });
  const { data: refis = [] } = useQuery({
    queryKey: ["dash_refis", up?.id], enabled: !!up && editor,
    queryFn: async () => { const { data, error } = await supabase.from("dash_accounts").select("*").eq("upload_id", up!.id).not("refi_estado", "is", null).order("refi_dias_sin_pago", { ascending: false, nullsFirst: false }).limit(300); if (error) throw error; return data as Acc[]; },
  });
  const { data: pend = [] } = useQuery({
    queryKey: ["dash_pending", up?.id], enabled: !!up,
    queryFn: () => fetchAll<Pend>((f, t) => supabase.from("dash_pending").select("*").eq("upload_id", up!.id).order("fecha", { ascending: false }).range(f, t) as never),
  });

  if (isLoading) return null;
  if (!up) return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no se cargó el archivo operativo (Alerta Refinanciaciones).</div>;
  const stale = (Date.now() - new Date(up.uploaded_at).getTime()) / 86400000 > 3;
  const sm = up.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={cn("rounded-md px-3 py-1 font-semibold", stale ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")}>{stale ? "⚠️ DATOS DESACTUALIZADOS" : "✓ DATOS ACTUALIZADOS"}</span>
        <span>Última actualización: <b>{fmtDT(up.uploaded_at)}</b></span>
        <span className="text-muted-foreground">· Archivo cargado: {up.file_name}</span>
      </div>

      {editor && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[["Cuentas", sm.cuentas], ["Gestores", sm.gestores], ["Refinanciaciones", sm.refis], ["Pagos pend. imputación", sm.pendientes], ["Gestiones pendientes", sm.gestionesPend]].map(([l, v]) => <Kpi key={l as string} label={l as string} value={fmtN(v as number)} />)}
          </section>
          <section className="space-y-2">
            <H>Alertas por responsable</H>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm"><thead className="bg-secondary/50 text-left text-xs text-muted-foreground"><tr><th className="p-2">Responsable</th><th className="p-2 text-right">Cuentas</th><th className="p-2 text-right">🔴 Prioridad</th><th className="p-2 text-right">Refis</th><th className="p-2 text-right">Pend. imput.</th><th /></tr></thead>
                <tbody>{sm.porResponsable.slice(0, 40).map((r) => (
                  <tr key={r.r} className="border-t"><td className="p-2">{r.r}</td><td className="p-2 text-right tabular-nums">{fmtN(r.cuentas)}</td><td className="p-2 text-right tabular-nums">{fmtN(r.rojo)}</td><td className="p-2 text-right tabular-nums">{fmtN(r.refis)}</td><td className="p-2 text-right tabular-nums">{fmtN(r.pend)}</td>
                    <td className="p-2 text-right"><Button size="sm" variant="outline" onClick={() => setWho(r.r)}>Ver</Button></td></tr>
                ))}</tbody></table>
            </div>
          </section>
          <section className="space-y-2">
            <H>Refinanciaciones (más días sin pago primero)</H>
            <AccTable rows={refis} compact />
          </section>
          <section className="space-y-2">
            <H>Pagos pendientes de imputación</H>
            <PendTable rows={pend} />
          </section>
        </>
      )}

      {(!editor || who) && (
        <MiGestion title={editor ? `Gestiones de ${who}` : "MI GESTIÓN"} accs={accs} pend={pend.filter((p) => !editor || (p.responsable ?? "").toLowerCase() === who.toLowerCase())} loading={isFetching} noGm={!editor && !myGm} />
      )}
    </div>
  );
}

function MiGestion({ title, accs, pend, loading, noGm }: { title: string; accs: Acc[]; pend: Pend[]; loading: boolean; noGm: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Todas");
  const [q, setQ] = useState("");
  const gv = (a: Acc) => /llamar|vencid/i.test(a.situacion ?? "") || (a.dias_ultimo_llamado ?? 0) > 7;
  const cv = (a: Acc) => (a.saldo_vencido ?? 0) > 0;
  const rr = (a: Acc) => !!a.refi_estado && alertLevel(a) === "rojo";
  const list = useMemo(() => accs.filter((a) => {
    if (q && !`${a.nombre} ${a.dni}`.toLowerCase().includes(q.toLowerCase())) return false;
    switch (tab) { case "Prioridad": return alertLevel(a) === "rojo"; case "Gestión vencida": return gv(a); case "Cuota vencida": return cv(a); case "Refinanciación": return !!a.refi_estado; case "Pago pendiente": return a.pendiente_imputacion; default: return true; }
  }).sort((a, b) => (b.dias_sin_pago ?? 0) - (a.dias_sin_pago ?? 0)), [accs, tab, q]);

  if (noGm) return <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Para ver <b>Mi Gestión</b> cargá tu <b>usuario de GM</b> en Mi ficha.</div>;
  return (
    <section className="space-y-3">
      <H>{title}</H>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Cuentas asignadas" value={fmtN(accs.length)} />
        <Kpi label="Gestiones vencidas" value={fmtN(accs.filter(gv).length)} />
        <Kpi label="Con cuota vencida" value={fmtN(accs.filter(cv).length)} />
        <Kpi label="Refis en riesgo" value={fmtN(accs.filter(rr).length)} />
        <Kpi label="Pagos pend. imputación" value={fmtN(pend.length)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("rounded-full border px-3 py-1 text-sm", tab === t ? "border-primary bg-primary font-semibold text-primary-foreground" : "bg-background hover:bg-secondary")}>{t}</button>)}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre o DNI" className="h-8 rounded-md border bg-background px-3 text-sm" />
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : <AccTable rows={list} />}
    </section>
  );
}

function AccTable({ rows, compact }: { rows: Acc[]; compact?: boolean }) {
  const [open, setOpen] = useState<Acc | null>(null);
  const [lim, setLim] = useState(100);
  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs text-muted-foreground"><tr><th className="p-2">Nombre</th><th className="p-2">Padrón</th><th className="p-2 text-right">Deuda</th><th className="p-2">Situación</th><th className="p-2 text-right">Días s/pago</th>{!compact && <th className="p-2">Última gestión</th>}<th className="p-2">{compact ? "Estado refi" : "Próxima gestión"}</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Sin cuentas para este filtro.</td></tr>}
            {rows.slice(0, lim).map((a) => (
              <tr key={a.dni} className="border-t">
                <td className="p-2"><span className={cn("mr-2 inline-block size-2 rounded-full", dot[alertLevel(a)])} />{a.nombre ?? a.dni}</td>
                <td className="p-2">{a.padron ?? "—"}</td><td className="p-2 text-right tabular-nums">$ {fmtN(a.deuda)}</td>
                <td className="max-w-48 truncate p-2">{a.situacion ?? "—"}</td><td className="p-2 text-right tabular-nums">{fmtN(a.dias_sin_pago)}</td>
                {!compact && <td className="p-2">{fmtD(a.ultimo_llamado)}</td>}
                <td className="max-w-40 truncate p-2">{compact ? a.refi_estado : a.proxima_gestion ?? "—"}</td>
                <td className="p-2 text-right"><Button size="sm" variant="outline" onClick={() => setOpen(a)}>Ver cuenta</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > lim && <Button variant="ghost" size="sm" onClick={() => setLim(lim + 200)}>Ver más ({fmtN(rows.length - lim)} restantes)</Button>}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{open?.nombre ?? open?.dni}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3 text-sm">
              <Block t="Datos" items={[["Nombre", open.nombre], ["DNI", open.dni], ["Padrón", open.padron], ["Responsable", open.responsable]]} />
              <Block t="Situación" items={[["Deuda", `$ ${fmtN(open.deuda)}`], ["Saldo vencido", `$ ${fmtN(open.saldo_vencido)}`], ["Cuotas", fmtN(open.cuotas)], ["Pagas / Restantes", `${fmtN(open.cuotas_pagas)} / ${fmtN(open.cuotas_restantes)}`], ["Días sin pago", fmtN(open.dias_sin_pago)], ["Último pago", fmtD(open.ultimo_pago)]]} />
              <Block t="Gestión" items={[["Último llamado", fmtD(open.ultimo_llamado)], ["Resultado", open.riesgo], ["Próxima gestión", open.proxima_gestion], ["Situación", open.situacion], ["Observaciones", open.pendiente_imputacion ? "Pago pendiente de imputación" : null]]} />
              {open.refi_estado && <Block t="Refinanciación" items={[["Estado", open.refi_estado], ["Fecha", fmtD(open.refi_fecha)], ["Vencimiento", fmtD(open.refi_vencimiento)], ["Cuota", `$ ${fmtN(open.refi_monto_cuota)}`], ["Cuotas", fmtN(open.refi_cuotas)], ["Días sin pago", fmtN(open.refi_dias_sin_pago)]]} />}
              <Block t="Contacto" items={[["Teléfono", open.telefono], ["Email", open.email]]} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PendTable({ rows }: { rows: Pend[] }) {
  return (
    <div className="max-h-96 overflow-auto rounded-xl border bg-card">
      <table className="w-full text-sm"><thead className="sticky top-0 bg-secondary text-left text-xs text-muted-foreground"><tr><th className="p-2">Fecha</th><th className="p-2">DNI</th><th className="p-2">Nombre</th><th className="p-2 text-right">Monto</th><th className="p-2">Responsable</th><th className="p-2">Padrón</th></tr></thead>
        <tbody>{rows.slice(0, 500).map((p, k) => <tr key={k} className="border-t"><td className="p-2">{fmtD(p.fecha)}</td><td className="p-2">{p.dni}</td><td className="p-2">{p.nombre}</td><td className="p-2 text-right tabular-nums">$ {fmtN(p.monto)}</td><td className="p-2">{p.responsable}</td><td className="p-2">{p.padron}</td></tr>)}</tbody></table>
    </div>
  );
}

function Block({ t, items }: { t: string; items: [string, string | null | undefined][] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">{items.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v ?? "—"}</dd></div>)}</dl>
    </div>
  );
}
function H({ children }: { children: string }) { return <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>; }
function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}
