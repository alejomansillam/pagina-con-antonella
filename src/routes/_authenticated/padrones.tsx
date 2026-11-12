import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { PADRONES } from "@/components/brand";
import { PisoDeudaCalc, normalizeAbogado } from "@/components/piso-deuda";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/padrones")({
  head: () => ({
    meta: [
      { title: "Padrones activos N1, N2 y N3 — Mansilla Garzón & Asoc." },
      { name: "description", content: "Consulta por DNI del padrón que se está trabajando en cada instancia." },
      { property: "og:title", content: "Padrones activos N1, N2 y N3" },
      { property: "og:description", content: "Consulta por DNI del padrón vigente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { dni?: string } =>
    typeof s["dni"] === "string" && s["dni"] ? { dni: s["dni"] } : {},
  component: Padrones,
});

type Inst = string; // "1135-N1" … (legacy: "N1")
const CARTERAS = ["1135", "1142"] as const;
const split = (i: string) => { const [a, b] = i.includes("-") ? i.split("-") : ["", i]; return { cartera: a ?? "", code: b ?? i }; };

const uploadsQuery = {
  queryKey: ["padron_uploads"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("padron_uploads").select("*");
    if (error) throw error;
    return data ?? [];
  },
};

function pick(row: Record<string, unknown>, keys: string[]) {
  const k = Object.keys(row).find((h) => keys.some((x) => h.toLowerCase().includes(x)));
  return k ? row[k] : undefined;
}

function Padrones() {
  const qc = useQueryClient();
  const { data: roles = [] } = useQuery(myRolesQuery);
  const { data: uploads = [] } = useQuery(uploadsQuery);
  const editor = canEdit(roles);
  const search = Route.useSearch();
  const [q, setQ] = useState(search.dni ?? "");
  useEffect(() => { if (search.dni) setQ(search.dni); }, [search.dni]);
  const [busy, setBusy] = useState<Inst | null>(null);
  const [cf, setCf] = useState<"Todas" | "1135" | "1142">("Todas");
  const dni = q.replace(/\D/g, "");

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["padron_search", dni],
    enabled: dni.length >= 6,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("padron_entries")
        .select("id, instancia, dni, titular, saldo, gestor, extra")
        .eq("dni", dni)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: fichas = [] } = useQuery({
    queryKey: ["dni_ficha", dni],
    enabled: dni.length >= 6,
    queryFn: async () => {
      const { data, error } = await supabase.from("dash_accounts").select("*").eq("dni", dni).limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const upMap = useMemo(() => Object.fromEntries(uploads.map((u) => [u.instancia, u])), [uploads]);

  const handleFile = async (inst: Inst, file: File) => {
    setBusy(inst);
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!, { defval: "" });
      const { data: u } = await supabase.auth.getUser();
      const mapped = rows
        .map((r) => {
          const d = String(pick(r, ["dni", "documento", "doc"]) ?? "").replace(/\D/g, "");
          const saldoRaw = pick(r, ["saldo", "deuda", "monto"]);
          const saldo = typeof saldoRaw === "number" ? saldoRaw : parseFloat(String(saldoRaw ?? "").replace(/\./g, "").replace(",", "."));
          return {
            instancia: inst,
            dni: d,
            titular: String(pick(r, ["titular", "nombre", "cliente", "apellido"]) ?? "") || null,
            saldo: Number.isFinite(saldo) ? saldo : null,
            gestor: String(pick(r, ["gestor", "equipo", "asignado"]) ?? "") || null,
            extra: r as never,
            uploaded_by: u.user!.id,
          };
        })
        .filter((r) => r.dni);
      if (!mapped.length) throw new Error("No encontré una columna de DNI en el archivo");
      const del = await supabase.from("padron_entries").delete().eq("instancia", inst);
      if (del.error) throw del.error;
      for (let i = 0; i < mapped.length; i += 500) {
        const { error } = await supabase.from("padron_entries").insert(mapped.slice(i, i + 500));
        if (error) throw error;
      }
      await supabase.from("padron_uploads").upsert({
        instancia: inst,
        file_name: file.name,
        rows_count: mapped.length,
        uploaded_by: u.user!.id,
        uploaded_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["padron_uploads"] });
      toast.success(`Padrón ${inst.replace("-", " · ")} actualizado: ${mapped.length} registros`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar el padrón");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl">Padrones activos</h1>
        <p className="mt-2 text-muted-foreground">Buscá un DNI para saber en qué instancia está y cómo negociar.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="DNI del cliente (sin puntos)"
          inputMode="numeric"
          className="w-full rounded-xl border border-input bg-card py-4 pl-11 pr-4 text-lg"
        />
      </div>

      {dni.length >= 6 && (
        <div className="space-y-3">
          {isFetching && <p className="text-sm text-muted-foreground">Buscando…</p>}
          {!isFetching && results.length === 0 && fichas.length === 0 && (
            <p className="rounded-lg border border-border bg-card p-4 text-sm">Ese DNI no figura en los padrones cargados.</p>
          )}
          {results.map((r) => {
            const sp = split(r.instancia);
            const p = PADRONES.find((x) => x.code === sp.code) ?? PADRONES[0]!;
            if (cf !== "Todas" && sp.cartera && sp.cartera !== cf) return null;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("rounded-md px-2.5 py-1 text-sm font-bold", p.className)}>{p.code}</span>
                  {sp.cartera && <span className="rounded-md border px-2 py-0.5 text-sm font-semibold">Abogado {sp.cartera}</span>}
                  <span className="font-medium">{r.titular ?? "Titular sin nombre"}</span>
                  <span className="text-muted-foreground">DNI {r.dni}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p>Saldo: <strong>{r.saldo != null ? `$ ${Number(r.saldo).toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "—"}</strong></p>
                  <p>Gestor/equipo: <strong>{r.gestor ?? "—"}</strong></p>
                  <p className="text-muted-foreground">{p.label}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.detail}</p>
              </div>
            );
          })}
          {fichas.map((a) => {
            const money = (n: number | null) => (n != null ? `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "—");
            const date = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
            const rows: [string, string][] = [
              ["Cuenta", a.cuenta ?? "—"],
              ["Padrón", a.padron ?? "—"],
              ["Responsable", a.responsable ?? "—"],
              ["Abogado", a.abogado ?? "—"],
              ["Deuda total", money(a.deuda)],
              ["Saldo cuota vencida", money(a.saldo_vencido)],
              ["Cuotas pagas / total", `${a.cuotas_pagas ?? "—"} / ${a.cuotas ?? "—"}`],
              ["Días sin pago", a.dias_sin_pago != null ? String(a.dias_sin_pago) : "—"],
              ["Último pago", date(a.ultimo_pago)],
              ["Último llamado", date(a.ultimo_llamado)],
              ["Situación", a.situacion ?? "—"],
              ["Próxima gestión", a.proxima_gestion ?? "—"],
              ["Refinanciación", a.refi_estado ? `${a.refi_estado} · vence ${date(a.refi_vencimiento)}` : "—"],
              ["Teléfono", a.telefono ?? "—"],
            ];
            return (
              <div key={a.id} className="rounded-xl border-2 border-primary/30 bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ficha de la cuenta (último tablero cargado)</p>
                <p className="mt-1 font-semibold">{a.nombre ?? "Sin nombre"} · DNI {a.dni}</p>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-border/60 py-1">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                {a.pendiente_imputacion && <p className="mt-3 text-sm font-semibold text-primary">Tiene un pago pendiente de imputación.</p>}
                <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Piso de deuda · uso interno</p>
                  <PisoDeudaCalc compact initialAbogado={normalizeAbogado(a.abogado)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cartera / Abogado</span>
        {(["Todas", ...CARTERAS] as const).map((c) => (
          <button key={c} onClick={() => setCf(c)} className={cn("rounded-full border px-4 py-1.5 text-sm", cf === c ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-card hover:bg-secondary")}>{c}</button>
        ))}
      </div>
      <div className={cn("grid gap-6", cf === "Todas" && "xl:grid-cols-2")}>
        {CARTERAS.filter((c) => cf === "Todas" || cf === c).map((c) => (
          <section key={c} className="rounded-xl border border-border bg-secondary/30 p-4">
            <h2 className="mb-3 font-display text-xl">Abogado {c}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {PADRONES.map((p) => {
                const key = `${c}-${p.code}`;
                const u = upMap[key];
                return (
                  <div key={key} className="rounded-xl border border-border bg-card p-4">
                    <span className={cn("rounded-md px-2.5 py-1 text-sm font-bold", p.className)}>{p.code}</span>
                    <p className="mt-3 text-sm font-medium">{p.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {u ? `${u.rows_count} registros · ${new Date(u.uploaded_at).toLocaleDateString("es-AR")}` : "Sin padrón cargado"}
                    </p>
                    {editor && (
                      <label className="mt-3 block">
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy !== null}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(key, f); e.target.value = ""; }} />
                        <span className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground">
                          <Upload className="size-3.5" /> {busy === key ? "Cargando…" : "Reemplazar"}
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {!editor && <p className="text-sm text-muted-foreground">Solo los Seniors y Supervisión pueden actualizar los padrones.</p>}
    </div>
  );
}
