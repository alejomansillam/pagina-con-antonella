import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de discriminación de deuda — Mansilla Garzón & Asoc." },
      {
        name: "description",
        content:
          "Herramienta interna para discriminar capital, intereses y honorarios extrajudiciales sobre la deuda total del cliente.",
      },
      {
        property: "og:title",
        content: "Calculadora de discriminación de deuda — Mansilla Garzón & Asoc.",
      },
      {
        property: "og:description",
        content: "Capital, intereses y honorarios calculados al instante para informar al cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalculadoraPage,
});

const COEF = 1.1815;

const fmt = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function parseNumber(value: string) {
  const clean = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function CalculadoraPage() {
  const [totalRaw, setTotalRaw] = useState("");
  const [capitalRaw, setCapitalRaw] = useState("");

  const total = parseNumber(totalRaw);
  const capital = parseNumber(capitalRaw);

  const result = useMemo(() => {
    if (total <= 0 || capital <= 0) return null;
    const capitalEIntereses = total / COEF;
    const intereses = capitalEIntereses - capital;
    const honorarios = total - capitalEIntereses;
    if (capital >= total) return { error: "El capital no puede ser mayor o igual a la deuda total." };
    if (intereses < 0)
      return { error: "El capital informado es demasiado alto para esa deuda total." };
    return { capital, intereses, honorarios, suma: capital + intereses + honorarios };
  }, [total, capital]);

  const detail =
    result && !("error" in result)
      ? [
          `Le compartimos el detalle de su deuda correspondiente al saldo informado:`,
          ``,
          `• Capital: ${fmt(result.capital)}`,
          `• Intereses: ${fmt(result.intereses)}`,
          `• Honorarios: ${fmt(result.honorarios)}`,
          ``,
          `Total discriminado: ${fmt(result.suma)}`,
          ``,
          `(Los honorarios corresponden a la alícuota institucional vigente sobre el coeficiente ${COEF}).`,
        ].join("\n")
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Herramientas del estudio
        </p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold">
          <Calculator className="size-7 text-primary" aria-hidden />
          Discriminación de deuda
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ingresá la deuda total y el capital informado. La herramienta separa capital, intereses y
          honorarios para que puedas explicárselo al cliente con precisión.
        </p>
      </header>

      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="total">Deuda total</Label>
          <Input
            id="total"
            inputMode="decimal"
            placeholder="1.500.000,00"
            value={totalRaw}
            onChange={(e) => setTotalRaw(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capital">Capital</Label>
          <Input
            id="capital"
            inputMode="decimal"
            placeholder="900.000,00"
            value={capitalRaw}
            onChange={(e) => setCapitalRaw(e.target.value)}
          />
        </div>

        {result && "error" in result && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {result.error}
          </p>
        )}

        {result && !("error" in result) && (
          <>
            <div className="space-y-3 rounded-lg bg-secondary p-5">
              <Row label="Capital" value={fmt(result.capital)} />
              <Row label="Intereses" value={fmt(result.intereses)} />
              <Row label="Honorarios" value={fmt(result.honorarios)} />
              <div className="border-t border-border pt-3">
                <Row label="Total verificado" value={fmt(result.suma)} strong />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Mensaje oficial para el cliente
              </p>
              <pre className="whitespace-pre-wrap rounded-lg bg-secondary p-4 font-sans text-sm leading-relaxed">
                {detail}
              </pre>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(detail);
                  toast.success("Mensaje copiado, listo para enviar al cliente");
                }}
              >
                <Copy className="size-4" aria-hidden />
                📋 Copiar mensaje para enviar
              </Button>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Los honorarios se calculan sobre la alícuota institucional vigente (coeficiente {COEF}),
        igual que en la planilla oficial del estudio.
      </p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={
          strong
            ? "text-sm font-semibold uppercase tracking-wide"
            : "text-sm text-muted-foreground"
        }
      >
        {label}
      </span>
      <span className={strong ? "font-display text-xl font-bold" : "font-medium tabular-nums"}>
        {value}
      </span>
    </div>
  );
}
