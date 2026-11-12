import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/resumen")({
  head: () => ({
    meta: [
      { title: "Resumen de Gestión — Mansilla Garzón & Asoc." },
      { name: "description", content: "Tablero del estudio: indicadores, ranking, objetivo de pagos y evolución por padrón." },
      { property: "og:title", content: "Resumen de Gestión" },
      { property: "og:description", content: "Tablero del estudio con KPIs, ranking y evolución." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Resumen,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { [k: string]: any } & Partial<Record<"cartera" | "padron" | "asignadas" | "pct_gestion" | "pct_contacto_positivo" | "cuentas_con_pago" | "pct_cancel_pp_sobre_asignado" | "nivel" | "posicion" | "total_estudios" | "falta_para_siguiente" | "actualizado" | "tramo" | "con_pagos" | "objetivo" | "mes" | "estudio" | "media", unknown>>;
type Dataset = Record<"RESUMEN_PADRON" | "RANKING" | "OBJETIVO_PAGOS" | "EVOLUCION", Row[]>;

const SCHEMA: Record<keyof Dataset, string[]> = {
  RESUMEN_PADRON: ["cartera", "padron", "asignadas", "pct_gestion", "pct_contacto_positivo", "cuentas_con_pago", "pct_con_pago", "pp_activos", "canceladas_mas_pp", "pct_cancel_pp_sobre_asignado"],
  RANKING: ["nivel", "padron", "posicion", "total_estudios", "falta_para_siguiente", "actualizado"],
  OBJETIVO_PAGOS: ["cartera", "tramo", "asignadas", "con_pagos", "objetivo"],
  EVOLUCION: ["mes", "nivel", "estudio", "media"],
};

const SHEET_ID = "1kjv5gFn6vJETSc2XjtLY7vmPzHXn_r16kVTrJGZ4ZvA";
const sheetUrl = (name: string) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${name}`;

const dashQuery = {
  queryKey: ["tablero_sheets"] as const,
  queryFn: async () => {
    const data = { RESUMEN_PADRON: [], RANKING: [], OBJETIVO_PAGOS: [], EVOLUCION: [] } as Dataset;
    const errors: string[] = [];
    await Promise.all(
      (Object.keys(SCHEMA) as (keyof Dataset)[]).map(async (sheet) => {
        try {
          const res = await fetch(sheetUrl(sheet), { cache: "no-store" });
          if (!res.ok) throw new Error();
          data[sheet] = parseSheet(sheet, await res.text());
        } catch (e) {
          errors.push(e instanceof Error && e.message ? e.message : `No se pudo cargar la hoja ${sheet}.`);
        }
      }),
    );
    return { data, errors };
  },
  staleTime: 5 * 60_000,
};

const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[$%\s.]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const pct = (v: unknown) => {
  const n = num(v);
  if (typeof v === "string" && v.includes("%")) return n;
  return Math.abs(n) <= 1 ? n * 100 : n;
};
const str = (v: unknown) => String(v ?? "").trim();
const norm = (k: string) => k.trim().toLowerCase();
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmtInt = (n: number) => Math.round(n).toLocaleString("es-AR");
const fmtPct = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000));
  const s = str(v);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) return new Date(Number(m[3]!.length === 2 ? "20" + m[3] : m[3]!), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

function parseSheet(sheet: keyof Dataset, csv: string): Row[] {
  const ws = XLSX.read(csv, { type: "string", raw: true }).Sheets["Sheet1"]!;
  const raw = XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: true });
  const header = (XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true })[0] ?? []).map((h) => norm(str(h)));
  if (sheet === "EVOLUCION" && !header.includes("estudio") && header.includes("mansilla")) header.push("estudio");
  const missing = SCHEMA[sheet].filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`La hoja ${sheet} no tiene las columnas: ${missing.join(", ")}.`);
  return raw.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) o[norm(k)] = v === "" ? null : v;
    if (o.estudio === undefined && o["mansilla"] !== undefined) o.estudio = o["mansilla"];
    if (o.cartera != null) o.cartera = str(o.cartera).replace(/^A/i, "");
    return o;
  });
}

function Resumen() {
  const { data: dash, isLoading, isFetching, refetch } = useQuery(dashQuery);
  const [cartera, setCartera] = useState("Todas");
  const [padron, setPadron] = useState("Todos");
  const [nivelEvo, setNivelEvo] = useState("N1");

  const ds = dash?.data;
  const matchC = (r: Row) => cartera === "Todas" || str(r.cartera) === cartera;
  const matchP = (r: Row) => padron === "Todos" || str(r.padron).toUpperCase() === padron;

  const view = useMemo(() => {
    if (!ds?.RESUMEN_PADRON?.length) return null;
    const res = ds.RESUMEN_PADRON.filter((r) => matchC(r) && matchP(r));
    const kpis = {
      asignadas: res.reduce((a, r) => a + num(r.asignadas), 0),
      gestion: avg(res.map((r) => pct(r.pct_gestion))),
      contacto: avg(res.map((r) => pct(r.pct_contacto_positivo))),
      conPago: res.reduce((a, r) => a + num(r.cuentas_con_pago), 0),
      cancel: avg(res.map((r) => pct(r.pct_cancel_pp_sobre_asignado))),
    };
    const carteras = cartera === "Todas" ? ["1135", "1142"] : [cartera];
    const ranking = carteras.map((c) => ({
      c,
      items: ["N1", "N2", "N3"]
        .map((n) => ({
          n,
          row: ds.RANKING.find(
            (r) =>
              (str(r.padron).toUpperCase() === n || str(r.nivel).toUpperCase() === n) &&
              (str(r.cartera) === c || str(r.nivel) === c || str(r.padron) === c),
          ),
        })),
    }));
    const objetivos = ds.OBJETIVO_PAGOS.filter(matchC);
    const dates = ds.RANKING.map((r) => toDate(r.actualizado)).filter((d): d is Date => !!d);
    const updated = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    const padrones = ["Todos", ...Array.from(new Set(ds.RESUMEN_PADRON.filter(matchC).map((r) => str(r.padron).toUpperCase()).filter(Boolean)))];
    return { kpis, ranking, objetivos, updated, padrones };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, cartera, padron]);

  const evo = useMemo(
    () =>
      (ds?.EVOLUCION ?? [])
        .filter((r) => (str(r.nivel).toUpperCase() === nivelEvo || str(r.padron).toUpperCase() === nivelEvo) && (cartera === "Todas" || !r.cartera || str(r.cartera) === cartera))
        .map((r) => {
          const d = toDate(r.mes);
          const label = typeof r.mes === "string" && !/^\d{4}-\d{2}-\d{2}T/.test(r.mes) ? r.mes : d ? `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : str(r.mes);
          return { mes: label, Estudio: num(r.estudio), Media: num(r.media) };
        }),
    [ds, nivelEvo, cartera],
  );

  const stale = view?.updated ? (Date.now() - view.updated.getTime()) / 86400000 > 3 : true;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tablero del estudio</p>
          <h1 className="font-serif text-3xl sm:text-4xl">Resumen de Gestión</h1>
          {view?.updated && (
            <p
              className={cn(
                "mt-2 inline-block rounded-md px-3 py-1 text-sm font-medium",
                stale ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
              )}
            >
              {stale
                ? `⚠️ Datos desactualizados. Última actualización: ${fmtDate(view.updated)}`
                : `✓ Datos actualizados: ${fmtDate(view.updated)}`}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} aria-label="Actualizar datos del tablero">
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} /> {isFetching ? "Actualizando…" : "Actualizar"}
        </Button>
      </div>


      {dash?.errors.map((e) => (
        <div key={e} role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⚠️ {e} Revisá que la planilla siga compartida y tocá «Actualizar».
        </div>
      ))}

      {isLoading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : !view ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No hay datos de indicadores para mostrar.</div>
      ) : (
        <>
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <Pills label="Cartera / Abogado" value={cartera} onChange={setCartera} options={["Todas", "1135", "1142"]} />
            <Pills label="Padrón / Instancia" value={padron} onChange={(v) => { setPadron(v); if (v !== "Todos") setNivelEvo(v); }} options={view.padrones} />
            <p className="text-sm font-medium">Viendo: {cartera === "Todas" ? "Ambas carteras" : `Abogado ${cartera}`} · {padron === "Todos" ? "Todos los padrones" : `Padrón ${padron}`}</p>
          </div>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Asignadas" value={fmtInt(view.kpis.asignadas)} />
            <Kpi label="% Gestión" value={fmtPct(view.kpis.gestion)} />
            <Kpi label="% Contacto positivo" value={fmtPct(view.kpis.contacto)} />
            <Kpi label="Cuentas con pago" value={fmtInt(view.kpis.conPago)} />
            <Kpi label="% Canceladas + PP" value={fmtPct(view.kpis.cancel)} />
          </section>

          <section className="space-y-3">
            <H>Ranking por cartera</H>
            <div className={cn("grid gap-4", view.ranking.length > 1 && "lg:grid-cols-2")}>
              {view.ranking.map(({ c, items }) => (
                <div key={c} className="rounded-xl border bg-secondary/40 p-3">
                  <p className="mb-2 text-sm font-semibold">Abogado {c}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {items.map(({ n, row }) => (
                      <div key={n} className="rounded-lg border bg-card p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{c} · {n}</p>
                        {row && row.posicion != null && row.posicion !== "" ? (
                          <>
                            <p className="mt-1 font-semibold">Posición {fmtInt(num(row.posicion))} de {fmtInt(num(row.total_estudios))}</p>
                            <p className="text-xs text-muted-foreground">Falta para el siguiente: $ {fmtInt(num(row.falta_para_siguiente))}</p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">{row ? `Sin posición${row.total_estudios ? ` · ${fmtInt(num(row.total_estudios))} estudios` : ""}` : "Sin datos"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <H>Objetivo de pagos</H>
            <div className="grid gap-3 sm:grid-cols-2">
              {view.objetivos.length === 0 && <p className="text-sm text-muted-foreground">Sin tramos para este filtro.</p>}
              {view.objetivos.map((r, i) => {
                const obj = num(r.objetivo);
                const cp = num(r.con_pagos);
                const p = obj ? (cp / obj) * 100 : 0;
                return (
                  <div key={i} className="rounded-xl border bg-card p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium">{str(r.tramo)} <span className="text-xs text-muted-foreground">· {str(r.cartera)}</span></p>
                      <p className="text-sm font-semibold">{fmtPct(p)}</p>
                    </div>
                    <Progress value={Math.min(100, p)} className="mt-2" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {fmtInt(cp)} / {fmtInt(obj)} con pagos · {fmtInt(num(r.asignadas))} asignadas
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <H>Evolución</H>
              <div className="flex gap-1">
                {["N1", "N2", "N3"].map((n) => (
                  <Button key={n} size="sm" variant={nivelEvo === n ? "default" : "outline"} onClick={() => setNivelEvo(n)}>
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <div className="h-72 rounded-xl border bg-card p-3">
              {evo.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Sin datos para {nivelEvo}.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" fontSize={12} />
                    <YAxis fontSize={12} width={48} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Estudio" stroke="var(--primary)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="Media" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 4" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function H({ children }: { children: string }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Pills({ label, value, onChange, options, hints }: { label: string; value: string; onChange: (v: string) => void; options: string[]; hints?: Record<string, string> }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              value === o ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-background hover:bg-secondary",
            )}
          >
            {o}
            {hints?.[o] && <span className="ml-1 text-xs opacity-70">({hints[o]})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
