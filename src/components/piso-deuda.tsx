import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const ABOGADOS = ["A1135", "A1142"] as const;
export const RIESGOS = ["NAR-ALTO", "NAR-MEDIO", "NAR-BAJO"] as const;
type Abogado = (typeof ABOGADOS)[number];
type Riesgo = (typeof RIESGOS)[number];

export function normalizeAbogado(v: string | null | undefined): Abogado | "" {
  const s = (v ?? "").replace(/\D/g, "");
  if (s.includes("1135")) return "A1135";
  if (s.includes("1142")) return "A1142";
  return "";
}

const fmt = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 4 });

function parseMoney(v: string) {
  const clean = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : NaN;
}

const pisoQuery = {
  queryKey: ["piso_params"],
  queryFn: async () => {
    const [f, c] = await Promise.all([
      supabase.from("piso_factors").select("abogado,riesgo,factor"),
      supabase.from("piso_config").select("coeficiente").eq("id", 1).maybeSingle(),
    ]);
    if (f.error) throw f.error;
    if (c.error) throw c.error;
    const factors: Record<string, number> = {};
    for (const r of f.data ?? []) factors[`${r.abogado}|${r.riesgo}`] = Number(r.factor);
    return { factors, coef: c.data ? Number(c.data.coeficiente) : NaN };
  },
  staleTime: 5 * 60_000,
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function Pills<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T | ""; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm",
            value === o ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-card hover:bg-secondary",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Saldo y Riesgo arrancan siempre vacíos; solo el abogado puede venir preseleccionado. */
export function PisoDeudaCalc({ initialAbogado = "", compact = false }: { initialAbogado?: Abogado | ""; compact?: boolean }) {
  const { data } = useQuery(pisoQuery);
  const [abogado, setAbogado] = useState<Abogado | "">(initialAbogado);
  const [riesgo, setRiesgo] = useState<Riesgo | "">("");
  const [saldo, setSaldo] = useState("");
  const [showAll, setShowAll] = useState(false);

  const k = parseMoney(saldo);
  const coef = data?.coef ?? NaN;
  const factor = abogado && riesgo ? data?.factors[`${abogado}|${riesgo}`] : undefined;
  const piso = useMemo(
    () => (factor != null && Number.isFinite(k) && Number.isFinite(coef) ? round2(k * factor * coef) : null),
    [factor, k, coef],
  );

  return (
    <div className={cn("space-y-4", compact ? "" : "rounded-xl border border-border bg-card p-5")}>
      <div className="space-y-1.5">
        <Label>Abogado</Label>
        <Pills options={ABOGADOS} value={abogado} onChange={setAbogado} />
      </div>
      <div className="space-y-1.5">
        <Label>Riesgo</Label>
        <Pills options={RIESGOS} value={riesgo} onChange={setRiesgo} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={compact ? "piso-saldo-c" : "piso-saldo"}>Saldo (K)</Label>
        <Input
          id={compact ? "piso-saldo-c" : "piso-saldo"}
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ej.: 1.000.000,00"
          value={saldo}
          onChange={(e) => setSaldo(e.target.value)}
        />
      </div>

      <div className="rounded-lg border-2 border-primary/30 bg-secondary/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Piso de deuda</p>
        <p className="mt-1 font-display text-3xl">{piso != null ? fmt(piso) : "—"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {factor != null && Number.isFinite(coef)
            ? `Saldo × ${fmtNum(factor)} × ${fmtNum(coef)}`
            : "Elegí abogado, riesgo e ingresá el saldo."}
        </p>
      </div>

      <Button type="button" variant="outline" size="sm" disabled={!Number.isFinite(k)} onClick={() => setShowAll((s) => !s)}>
        {showAll ? "Ocultar los 6 pisos" : "Ver los 6 pisos posibles"}
      </Button>
      {showAll && Number.isFinite(k) && data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3">Riesgo</th>
                {ABOGADOS.map((a) => <th key={a} className="py-1 pr-3 text-right">{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {RIESGOS.map((r) => (
                <tr key={r} className="border-t border-border/60">
                  <td className="py-1.5 pr-3 font-medium">{r}</td>
                  {ABOGADOS.map((a) => {
                    const f = data.factors[`${a}|${r}`];
                    const active = a === abogado && r === riesgo;
                    return (
                      <td key={a} className={cn("py-1.5 pr-3 text-right", active && "font-bold text-primary")}>
                        {f != null ? fmt(round2(k * f * coef)) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Uso interno: no se comparte con el cliente ni se incluye en mensajes.</p>
    </div>
  );
}
