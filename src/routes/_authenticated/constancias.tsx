import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateLibreDeuda, validateLibreDeuda, type LibreDeudaData } from "@/lib/libre-deuda";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/constancias")({
  head: () => ({
    meta: [
      { title: "Constancia de libre de deuda — Mansilla Garzón & Asoc." },
      { name: "description", content: "Generá el libre deuda con el formato oficial autorizado de Naranja X." },
      { property: "og:title", content: "Constancia de libre de deuda" },
      { property: "og:description", content: "Libre deuda con formato oficial de Naranja X, datos del cliente y fecha de cancelación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Constancias,
});

function Constancias() {
  const [f, setF] = useState<LibreDeudaData>({ nombre: "", dni: "", fecha: "", pago: "" });
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setF(value => ({ ...value, fecha: local }));
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const update = (key: keyof LibreDeudaData, value: string) => {
    setF(current => ({ ...current, [key]: value }));
    setUrl("");
    setError("");
  };
  const ready = Boolean(f.nombre.trim() && f.dni && f.fecha && f.pago);
  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      validateLibreDeuda(f);
      const bytes = await generateLibreDeuda(f);
      setUrl(URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo generar la constancia.";
      setError(message);
      toast.error(message);
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Constancia de libre de deuda</h1>
        <p className="mt-2 text-muted-foreground">Modelo oficial de Naranja X</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {([["nombre", "Nombre y apellido"], ["dni", "DNI (sin puntos)"], ["fecha", "Fecha de emisión"], ["pago", "Fecha de cancelación"]] as const).map(([key, label]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`libre-${key}`}>{label}</Label>
            <Input id={`libre-${key}`} type={key === "fecha" || key === "pago" ? "date" : "text"} inputMode={key === "dni" ? "numeric" : undefined} value={f[key]} onChange={e => update(key, e.target.value)} />
          </div>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button disabled={!ready || busy} onClick={generate}>{busy ? "Generando…" : "Generar libre deuda"}</Button>
        {url && <Button asChild variant="outline"><a href={url} download={`LibreDeuda_${f.dni}.pdf`}><Download className="size-4" />Descargar PDF</a></Button>}
        {url && <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer">Abrir PDF</a></Button>}
      </div>
    </div>
  );
}
