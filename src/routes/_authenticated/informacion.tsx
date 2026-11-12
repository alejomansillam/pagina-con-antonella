import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Search } from "lucide-react";

import { articlesQuery, type Article } from "@/lib/kb";
import { PADRONES } from "@/components/brand";
import { OfficialLines } from "@/components/official-lines";
import { BankAccounts } from "@/components/bank-accounts";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/informacion")({
  head: () => ({
    meta: [
      { title: "Centro de información — Portal del Estudio" },
      { name: "description", content: "Criterios, manuales, acuerdos, canales oficiales, cuentas y preguntas frecuentes del estudio en un solo lugar." },
      { property: "og:title", content: "Centro de información del estudio" },
      { property: "og:description", content: "Toda la información de consulta interna, ordenada y buscable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InformacionPage,
});

type CatKey = "criterios" | "acuerdos" | "canales" | "faq";
const CATS: { key: CatKey; emoji: string; title: string; hint: string }[] = [
  { key: "criterios", emoji: "📘", title: "Criterios y Manuales", hint: "N1/N2/N3 y manuales de proceso" },
  { key: "acuerdos", emoji: "🤝", title: "Acuerdos y Cierres", hint: "Políticas y condiciones" },
  { key: "canales", emoji: "📞", title: "Canales Oficiales y Cuentas", hint: "Líneas y datos útiles" },
  { key: "faq", emoji: "❓", title: "Preguntas Frecuentes", hint: "Dudas habituales" },
];

type Item = { id: string; cat: CatKey; title: string; text: string; to?: "/plantillas" | "/padrones" | "/constancias" | "/piso-deuda" | "/calculadora"; slug?: string };

const STATIC: Item[] = [
  ...PADRONES.map((p) => ({ id: `pad-${p.code}`, cat: "criterios" as const, title: `${p.code} · ${p.label}`, text: p.detail, to: "/padrones" as const })),
  { id: "acuerdo", cat: "acuerdos", title: "Acuerdo Oficial de Pago", text: "Texto oficial con cuotas, vencimiento y medio de pago (Naranja X, CBU, titular Tarjeta Naranja S.A.). Se copia desde Plantillas.", to: "/plantillas" },
  { id: "medios", cat: "acuerdos", title: "Medios de pago permitidos", text: "Solo transferencia a la cuenta oficial. Puede pagar un tercero si la cuenta no tiene deuda registrada: enviar foto del comprobante y DNI del titular sin puntos. No se aceptan Rapipago, Pago Mis Cuentas, Pago Fácil con DNI ni tarjeta.", to: "/plantillas" },
  { id: "constancias", cat: "acuerdos", title: "Constancias de Deuda — Protocolo", text: "Cargar siempre como acuerdo en Abogados Naranja X y en GM → Económicos con monto y fecha límite. Tipificar Gestión Especial / Constancia de Deuda con fecha previa al vencimiento.", to: "/plantillas" },
  { id: "libre", cat: "acuerdos", title: "Libre de Deuda", text: "Descargá el archivo oficial de constancia y libre de deuda.", to: "/constancias" },
  { id: "nomolestar", cat: "acuerdos", title: "Respuesta «NO MOLESTAR» en Chattigo", text: "Asentar en GM pestaña GENERAL con el número de contacto y cerrar en Chattigo solo como NUMERO EQUIVOCADO, idealmente en la primera vuelta." },
  { id: "faq-dni", cat: "faq", title: "¿Cómo busco un cliente por DNI?", text: "Escribí el DNI en el buscador de arriba del portal o en Padrones: te muestra el padrón y la ficha de la cuenta.", to: "/padrones" },
  { id: "faq-desglose", cat: "faq", title: "¿Cómo le informo el desglose de la deuda al cliente?", text: "Usá la Calculadora: ingresá deuda total y capital, y copiá el mensaje oficial con un clic.", to: "/calculadora" },
  { id: "faq-pago", cat: "faq", title: "¿Qué medios de pago se aceptan?", text: "Solo transferencia a la cuenta oficial de Naranja X (Banco Galicia). No se aceptan Rapipago, Pago Fácil, Pago Mis Cuentas ni tarjeta.", to: "/plantillas" },
  { id: "faq-gm", cat: "faq", title: "No veo mis cuentas en Planes de pago", text: "Cargá tu usuario de GM en Mi ficha; el portal cruza tus cuentas con ese usuario." },
  { id: "faq-ayuda", cat: "faq", title: "¿A quién consulto una duda?", text: "A tu Senior de equipo o a Supervisión. En Agenda tenés internos y WhatsApp de todos." },
];

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function articleCat(a: Article): CatKey {
  return /acuerdo|cierre|constancia|pago/i.test(a.title) ? "acuerdos" : "criterios";
}

function ItemRow({ item }: { item: Item }) {
  const body = (
    <>
      <p className="font-semibold leading-snug">{item.title}</p>
      {item.text && <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>}
    </>
  );
  const cls = "block rounded-lg border border-border bg-card p-4";
  if (item.slug)
    return (
      <Link to="/article/$slug" params={{ slug: item.slug }} className={cn(cls, "hover:bg-secondary")}>
        {body}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">Leer <ArrowUpRight className="size-3" /></span>
      </Link>
    );
  return (
    <div className={cls}>
      {body}
      {item.to && (
        <Link to={item.to} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Abrir <ArrowUpRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

function InformacionPage() {
  const { data: articles = [] } = useQuery(articlesQuery);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CatKey | null>(null);

  const items = useMemo<Item[]>(
    () => [
      ...STATIC,
      ...articles.map((a) => ({ id: a.id, cat: articleCat(a), title: a.title, text: a.summary, slug: a.slug })),
    ],
    [articles],
  );

  const term = norm(q.trim());
  const hits = term ? items.filter((i) => norm(`${i.title} ${i.text}`).includes(term)).slice(0, 12) : [];
  const cat = CATS.find((c) => c.key === open);

  let panel: ReactNode = null;
  if (open === "canales")
    panel = (
      <div className="space-y-6">
        <OfficialLines />
        <BankAccounts />
      </div>
    );
  else if (open) panel = <div className="space-y-3">{items.filter((i) => i.cat === open).map((i) => <ItemRow key={i.id} item={i} />)}</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <h1 className="font-display text-3xl">Centro de información</h1>
        <p className="mt-2 text-muted-foreground">Todo lo que necesitás consultar, en un solo lugar.</p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar criterios, acuerdos, cuentas, preguntas…"
          className="h-14 rounded-full pl-12 text-base"
          aria-label="Buscar en el Centro de información"
        />
      </div>

      {term ? (
        <div className="space-y-3">
          {hits.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Sin resultados para «{q}».</p>
          ) : (
            hits.map((i) => <ItemRow key={i.id} item={i} />)
          )}
          {/(cbu|alias|cuenta|telefono|linea|whatsapp)/.test(term) && (
            <button onClick={() => setOpen("canales")} className="text-sm font-semibold text-primary">Ver canales oficiales y cuentas →</button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => setOpen(c.key)}
              className="surface-lift flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left hover:bg-secondary"
            >
              <span className="text-2xl" aria-hidden>{c.emoji}</span>
              <span>
                <span className="block font-semibold">{c.title}</span>
                <span className="block text-sm text-muted-foreground">{c.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-display text-xl">{cat ? `${cat.emoji} ${cat.title}` : ""}</SheetTitle>
            <SheetDescription>{cat?.hint}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 px-4 pb-6">{panel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
