import { createFileRoute } from "@tanstack/react-router";

import { PisoDeudaCalc } from "@/components/piso-deuda";

export const Route = createFileRoute("/_authenticated/piso-deuda")({
  head: () => ({
    meta: [
      { title: "Piso de deuda (uso interno) — Mansilla Garzón & Asoc." },
      { name: "description", content: "Herramienta interna para calcular el piso de deuda según abogado y riesgo." },
      { property: "og:title", content: "Piso de deuda — uso interno" },
      { property: "og:description", content: "Cálculo interno del piso de deuda por abogado y riesgo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PisoDeudaPage,
});

function PisoDeudaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Uso interno</span>
        <h1 className="mt-2 font-display text-3xl">Piso de deuda</h1>
        <p className="mt-1 text-muted-foreground">Ingresá a mano los datos de la página Abogados NX.</p>
      </div>
      <PisoDeudaCalc />
    </div>
  );
}
