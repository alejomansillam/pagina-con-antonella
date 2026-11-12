import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { canEdit, myRolesQuery } from "@/lib/roles";
import { contentQuery, saveContent } from "@/lib/editable-content";

import { Button } from "@/components/ui/button";
import { ChattigoResponses } from "@/components/chattigo-responses";
import { BankAccounts } from "@/components/bank-accounts";
import { Kbd, ShortcutsGuide } from "@/components/shortcuts-guide";

export const Route = createFileRoute("/_authenticated/plantillas")({
  head: () => ({
    meta: [
      { title: "Plantillero de gestión diaria — Mansilla Garzón & Asoc." },
      { name: "description", content: "Modelos de mensajes para Chattigo, WhatsApp y notas de Gestión de Mora, listos para copiar." },
      { property: "og:title", content: "Plantillero de gestión diaria" },
      { property: "og:description", content: "Mensajes listos para copiar y pegar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Plantillas,
});

const CBU = "0070076420000010396951";

const VERIF = "\n\nPuede verificar la autenticidad de nuestro estudio ingresando a nuestra web oficial: www.mansillayasoc.com.ar";

const T = [
  { g: "Primer contacto", t: "Presentación y sondeo", x: "Hola [NOMBRE], te escribimos desde el Estudio Mansilla Garzón & Asoc. en representación de Naranja X. Queremos ayudarte a regularizar tu cuenta. ¿Qué monto mensual podrías abonar? Indicanos también la fecha exacta en la que podrías hacer el primer pago." + VERIF },
  { g: "Primer contacto", t: "Definición en el día", x: "[NOMBRE], para mantener las condiciones ofrecidas necesitamos que nos confirmes hoy el plan elegido y la fecha de pago. Quedamos atentos." + VERIF },
  { g: "Acuerdo y pago", t: "Formalización del acuerdo", x: "Queda formalizado el acuerdo a nombre de [NOMBRE], DNI [DNI]: [N° CUOTAS] cuotas fijas de $[MONTO], con vencimiento el día [DÍA] de cada mes a partir de [MES].\n\nEl pago se realiza *únicamente por transferencia* al CBU " + CBU + " a nombre de *TARJETA NARANJA S.A.* (Banco Galicia).\n\nPuede transferir un tercero si su cuenta no tiene deudas con Naranja X. Enviá foto legible del comprobante y DNI del titular de la cuenta que transfiere.\n\n*No habilitados:* Rapipago, Pago Fácil por DNI, Pago Mis Cuentas ni pagos con tarjeta." + VERIF },
  { g: "Acuerdo y pago", t: "Datos bancarios", x: "El pago se realiza exclusivamente por transferencia al CBU " + CBU + " a nombre de *TARJETA NARANJA S.A.* (Banco Galicia), desde cualquier app bancaria, homebanking o billetera virtual." },
  { g: "Seguimiento", t: "Recordatorio anticipado (5 días)", x: "Hola [NOMBRE], te recordamos que el [FECHA] vence el pago acordado de $[MONTO]. Si tenés alguna duda, escribinos. La fecha pactada es el límite para mantener el acuerdo." },
  { g: "Seguimiento", t: "Día del vencimiento", x: "[NOMBRE], hoy vence tu pago de $[MONTO]. Cuando lo realices, enviános la foto del comprobante para imputarlo. ¡Gracias!" },
  { g: "Seguimiento", t: "Reclamo de comprobante", x: "[NOMBRE], no recibimos el comprobante del pago de hoy. Por favor envialo a la brevedad. La falta de respuesta se computa operativamente como negativa de pago." },
  { g: "Atraso", t: "Incumplimiento temprano (24 hs)", x: "[NOMBRE], registramos que no se realizó el pago acordado. Tenés 24 hs hábiles para regularizarlo; de lo contrario el acuerdo pierde vigencia y se exigirá el saldo total sin bonificaciones." },
  { g: "Atraso", t: "Pago con interés por atraso", x: "En razón del atraso transcurrido, el pago debe abonarse con interés. Consultá el monto actualizado antes de realizar la transferencia." },
  { g: "Prejudicial", t: "Último aviso", x: "*ÚLTIMO AVISO PREJUDICIAL* — [NOMBRE], DNI [DNI]: si no regularizás hoy, el convenio quedará sin efecto de forma irrevocable, con reliquidación total del saldo, intereses punitorios y costas, sin posibilidad de nuevos planes." },
  { g: "Prejudicial", t: "Baja del acuerdo", x: "Te informamos que el acuerdo fue dado de baja por incumplimiento. Se pierden los beneficios otorgados, se exige el saldo íntegro actualizado y la situación se informa a BCRA y Veraz, quedando habilitada la vía ejecutiva." },
  { g: "Contado", t: "Oferta de cancelación", x: "[NOMBRE], tenemos una oferta especial: cancelación en un pago único de $[MONTO], con quita total de intereses y bonificación sobre capital. Vigencia improrrogable hasta el [FECHA]. Confirmanos antes de transferir para aplicar la quita." },
  { g: "Soporte", t: "Comprobante recibido", x: "¡Gracias [NOMBRE]! Recibimos tu comprobante. Vamos a verificar la acreditación y te confirmamos." },
  { g: "Nota GM", t: "Nota de acuerdo en GM", x: "Propue: acuerdo [N° CUOTAS] x $[MONTO], vto día [DÍA] desde [MES]. Entrega inicial $[MONTO] el [FECHA]. Enviado CBU y condiciones por Chattigo. Seguimiento día -5." },
  { g: "Primer contacto", t: "Primera vuelta", x: "Buenas tardes Sr/a. [NOMBRE]. Le habla [GESTOR] de Estudio Jurídico Mansilla.\nLe informamos que su situación pendiente con Naranja X fue ingresada a nuestro estudio el [FECHA INGRESO] debido a que no se han registrado pagos desde [MES ÚLTIMO PAGO].\nA consecuencia de esto tenemos instrucciones de gestionar la misma a los fines de llegar a un acuerdo pre-judicial y evitar el pase a una instancia superior.\n\n*El total adeudado es de $[MONTO], y tiene la oportunidad de saldar su situación con una quita pre-aprobada por la entidad NARANJA X, por un total de $[MONTO CONTADO] o bien hasta 3 cuotas de $[MONTO CUOTA]*\n\nEn el caso de no poder acceder a alguna de estas propuestas indique sus posibilidades de pago para poder analizarlas y, en base a su total adeudado, ver qué opciones podemos ofrecerle.\nLe sugerimos tomar una decisión inmediata para evitar que su situación se agrave aún más.\n¿Cómo procederá?" + VERIF },
  { g: "Negociación", t: "Pide más cuotas", x: "Buenas tardes Sr/a. [NOMBRE], le habla [GESTOR] de Estudio Jurídico Mansilla en virtud de su situación pendiente con Naranja X, intento comunicarme pero no logro contacto.\nAl estar en instancia pre-judicial, las opciones de financiación son limitadas, ya que la entidad busca resolver la situación en el menor plazo posible. Por favor, indíqueme cuánto podría abonar de forma inmediata para evaluar alternativas acordes al total adeudado." },
  { g: "Negociación", t: "Sin trabajo (embargo)", x: "Comprendemos, sin embargo, la falta de empleo no lo exime de responsabilidad sobre la deuda, ya que se trata de una obligación asumida por usted. En caso de no regularizar, se procederá con las medidas legales correspondientes, que podrían incluir el embargo de haberes, cuentas bancarias o bienes registrables.\nPor favor, infórmenos si tiene intención de regularizar y, en ese caso, qué monto podría abonar de forma mensual e inmediata para ser evaluado por el área legal." },
  { g: "Negociación", t: "Sin trabajo (derivación)", x: "Buenas tardes Sr/a. [NOMBRE]. Entendemos su situación, sin embargo queremos recordarle que el momento para llegar a un acuerdo es ahora, ya que el plazo de mediación es limitado.\nEs fundamental que nos indique concretamente cómo tiene pensado resolver su situación a la brevedad. En caso de no contar con una respuesta concreta que incluya al menos un monto que pueda abonar, la deuda será derivada a la próxima instancia, con los costos que eso implica.\nQuedo atenta a su respuesta para ayudarle a evitar la instancia judicial y encontrar una solución." },
  { g: "Negociación", t: "Monto desproporcionado", x: "Actualmente su deuda es de $[MONTO], el monto que nos indica es sumamente desproporcionado, a la entidad le resulta más conveniente avanzar directamente a la instancia superior.\nSin embargo, se le ofrece de manera excepcional una alternativa para evitar la derivación:\n*[N° CUOTAS] cuotas de $[MONTO CUOTA], cancelando por un total de $[MONTO TOTAL], con quita de intereses incluida*\nEsta propuesta estará disponible únicamente si abona hasta el día *[FECHA]*\n¿Acepta proceder por esta opción? Quedo a la espera de su respuesta." },
  { g: "Negociación", t: "Pide abonar otro mes (seña)", x: "Comprendo que tiene intenciones de acceder a un acuerdo el mes próximo, pero para poder solicitar la prórroga y asegurar que su deuda siga en instancia pre-judicial, necesitamos dejar constancia del compromiso mediante un anticipo a modo de seña.\nLe consulto: ¿cuánto puede abonar de manera inmediata?\nCon ese dato, podemos evaluar alternativas.\nAguardamos su respuesta para avanzar." },
  { g: "Acuerdo y pago", t: "Acepta acuerdo", x: "En breve le enviaré el acuerdo junto con los datos bancarios correspondientes.\nEl pago debe realizarse por transferencia a un CBU habilitado por Naranja X para el cobro de deudas pre-judicializadas. La cuenta destino estará a nombre de *TARJETA NARANJA SA*, por lo que podrá verificar que el dinero ingresará directamente a la entidad. El pago puede realizarse desde cualquier app bancaria, homebanking o billetera virtual.\nEs fundamental que se cumpla con lo acordado en tiempo y forma, ya que en caso de incumplimiento del plan, nos veríamos forzados a dar de baja lo acordado.\nLe pido que lea detalladamente el acuerdo, ya que en él encontrará toda la información relevante, así como los medios NO habilitados para el pago, para evitar que pierda lo abonado.\nQuedo a disposición para cualquier consulta." + VERIF },
  { g: "Acuerdo y pago", t: "Acuerdo con anticipo", x: "[NOMBRE] DU [DNI], le recuerdo lo acordado:\n*[N° CUOTAS] cuotas de $[MONTO] con vencimiento los días [DÍA] de cada mes, a partir de [MES], debiendo abonar previamente un anticipo de $[ANTICIPO] el día [FECHA ANTICIPO], el cual será restado de su primer cuota*\n\nMEDIO DE PAGO: Transferencia a cuenta Naranja X\nCBU: " + CBU + "\nTitular: Tarjeta Naranja S.A.\nBanco: Galicia\n\n⚠️ IMPORTANTE: El pago puede ser realizado por un tercero, siempre que la cuenta bancaria desde la cual se efectúe la transferencia no registre ni haya registrado anteriormente una deuda con la entidad.\nPara imputar correctamente el pago, deberá enviar por este medio la foto del comprobante de transferencia y el número de DNI del titular de la cuenta desde la cual se realizó la transferencia, escrito sin puntos ni espacios. No es necesario enviar foto del DNI.\n\nMEDIOS NO HABILITADOS: Rapipago, Pago Mis Cuentas, Pago Fácil con DNI y pagos con tarjeta.\nEl Estudio no se responsabiliza por pagos realizados mediante medios no habilitados o de manera incorrecta.\n\nConsultas:\n0351-4242424 / 0351-155684731 / 0351-153964745" + VERIF },
];

const ACUERDO_OFICIAL = `Le envío el acuerdo de pago:

[X] cuotas de $[X], con vencimiento el día [X] de cada mes, a partir de [X].

MEDIO DE PAGO: Transferencia a cuenta Naranja X

CBU: 0070076420000010396951

Titular: Tarjeta Naranja S.A.

Banco: Galicia

IMPORTANTE: El pago puede ser realizado por un tercero, siempre que la cuenta bancaria desde la cual se efectúe la transferencia no registre ni haya registrado anteriormente una deuda con la entidad.

Para imputar correctamente el pago, deberá enviar por este medio la foto del comprobante de transferencia y el número de DNI del titular de la cuenta desde la cual se realizó la transferencia, escrito sin puntos ni espacios. No es necesario enviar foto del DNI.

MEDIOS NO HABILITADOS: Rapipago, Pago Mis Cuentas, Pago Fácil con DNI y pagos con tarjeta.

Puede verificar la autenticidad de nuestro estudio ingresando a nuestra web oficial: www.mansillayasoc.com.ar

El Estudio no se responsabiliza por pagos realizados mediante medios no habilitados o de manera incorrecta.

Consultas:

0351-4242424 / 0351-155684731 / 0351-153964745`;

function AcuerdoOficial() {
  const copy = () => { navigator.clipboard.writeText(ACUERDO_OFICIAL); toast.success("Texto del acuerdo copiado al portapapeles"); };
  return (
    <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Módulo · Acuerdo Oficial de Pago</p>
          <h2 className="mt-1 font-display text-xl">Acuerdo Oficial de Pago</h2>
          <p className="mt-1 text-sm text-muted-foreground">Texto oficial. Reemplazá lo que está entre corchetes antes de enviarlo.</p>
        </div>
        <Button size="lg" onClick={copy}>
          <Copy className="size-4" /> Copiar texto
        </Button>
      </div>
      <pre
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " " || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c")) { e.preventDefault(); copy(); }
        }}
        className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-4 font-sans text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {ACUERDO_OFICIAL}
      </pre>
    </section>
  );
}

const CONSTANCIA_TIPIFICACION = `Próxima gestión: Gestión Especial
Situación: Constancia de Deuda
Fecha vencida: colocar siempre una fecha previa al vencimiento.`;

function ConstanciasDeuda() {
  const copy = () => { navigator.clipboard.writeText(CONSTANCIA_TIPIFICACION); toast.success("Tipificación copiada al portapapeles"); };
  return (
    <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Módulo · Proceso</p>
      <h2 className="mt-1 font-display text-xl">Constancias de Deuda — Protocolo operativo</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">1. Carga obligatoria</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            <li>Todas las constancias y planes (con o sin entrega) deben estar cargados como <strong className="text-foreground">acuerdo en la página de Abogados Naranja X</strong>, al igual que en <strong className="text-foreground">Gestión de Mora → Económicos</strong>.</li>
            <li>Generar el plan de pago con el <strong className="text-foreground">monto informado</strong> y la <strong className="text-foreground">fecha límite de pago</strong>.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <h3 className="text-sm font-semibold">2. Indicaciones clave con el cliente <span className="text-amber-600 dark:text-amber-400">(muy importante)</span></h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            <li><strong className="text-foreground">Fecha de consulta:</strong> solicitar al cliente que indique la fecha exacta en la que realizará la consulta en el banco.</li>
            <li><strong className="text-foreground">Vencimiento del plan:</strong> explicar de forma muy clara la fecha de vencimiento del plan.</li>
            <li><strong className="text-foreground">Demora bancaria:</strong> informar que la consulta/actualización en el banco puede demorar habitualmente algunos días.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold">3. Tipificación en Gestión de Mora (GM)</h3>
            <Button size="sm" variant="outline" onClick={copy}><Copy className="size-3.5" /> Copiar</Button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{CONSTANCIA_TIPIFICACION}</pre>
        </div>
      </div>
    </section>
  );
}

type Tpl = { g: string; t: string; x: string };
const TPL_KEY = "plantillas-diarias";

function TemplatesEditor({ items, onClose }: { items: Tpl[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [d, setD] = useState<Tpl[]>(() => items.map((i) => ({ ...i })));
  const upd = (i: number, p: Partial<Tpl>) => setD((x) => x.map((t, j) => (j === i ? { ...t, ...p } : t)));
  const save = async () => {
    const clean = d.filter((t) => t.t.trim() && t.x.trim()).map((t) => ({ g: t.g.trim() || "General", t: t.t.trim(), x: t.x }));
    if (new Set(clean.map((t) => t.t)).size !== clean.length) { toast.error("Hay dos plantillas con el mismo título"); return; }
    try {
      await saveContent(TPL_KEY, "Plantillas diarias", clean);
      toast.success("Plantillas guardadas");
      qc.invalidateQueries({ queryKey: ["editable_content", TPL_KEY] });
      onClose();
    } catch { toast.error("No se pudo guardar"); }
  };
  return (
    <section className="surface space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">Editar plantillas</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setD((x) => [{ g: "General", t: "", x: "" }, ...x])}><Plus className="size-4" /> Nueva plantilla</Button>
          <Button size="sm" onClick={save}>Guardar cambios</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Usá corchetes para las variables, por ejemplo [NOMBRE], [DNI], [MONTO] o [FECHA].</p>
      {d.map((t, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
            <input aria-label="Grupo" value={t.g} onChange={(e) => upd(i, { g: e.target.value })} placeholder="Grupo" list="tpl-groups" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <input aria-label="Título" value={t.t} onChange={(e) => upd(i, { t: e.target.value })} placeholder="Título" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <Button size="icon" variant="ghost" aria-label="Borrar plantilla" onClick={() => confirm("¿Borrar esta plantilla?") && setD((x) => x.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
          </div>
          <textarea aria-label="Mensaje" value={t.x} onChange={(e) => upd(i, { x: e.target.value })} rows={5} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        </div>
      ))}
      <datalist id="tpl-groups">{Array.from(new Set(d.map((t) => t.g))).map((g) => <option key={g} value={g} />)}</datalist>
    </section>
  );
}

function Plantillas() {
  const [q, setQ] = useState("");
  const [g, setG] = useState("Todas");
  const [tab, setTab] = useState<"diarias" | "chattigo">("diarias");
  const [editing, setEditing] = useState(false);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const { data: saved } = useQuery(contentQuery<Tpl[]>(TPL_KEY));
  const all: Tpl[] = saved?.length ? saved : T;
  const groups = ["Todas", ...Array.from(new Set(all.map((x) => x.g)))];
  const list = useMemo(
    () => all.filter((x) => (g === "Todas" || x.g === g) && (x.t + x.x).toLowerCase().includes(q.toLowerCase())),
    [q, g, all],
  );
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Plantillero de gestión diaria</h1>
        <p className="mt-2 text-muted-foreground">Reemplazá lo que está entre corchetes antes de enviar. Nunca modifiques montos ni condiciones pactadas.</p>
      </header>
      <div className="inline-flex rounded-full border border-border bg-secondary/60 p-1">
        {([["diarias", "Plantillas diarias"], ["chattigo", "Campañas Chattigo"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <ShortcutsGuide />
      <BankAccounts />
      {tab === "chattigo" ? <ChattigoResponses /> : <>
      <AcuerdoOficial />
      <ConstanciasDeuda />
      {canEdit(roles) && !editing && (
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar plantillas</Button>
      )}
      {editing && <TemplatesEditor items={all} onClose={() => setEditing(false)} />}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plantilla…" className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3" />
      </div>
      <div className="flex flex-wrap gap-2">
        {groups.map((x) => (
          <button key={x} onClick={() => setG(x)} className={`rounded-full px-3 py-1 text-sm ${g === x ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{x}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((x) => {
          const doCopy = () => { navigator.clipboard.writeText(x.x); toast.success("Mensaje copiado al portapapeles"); };
          return (
          <article
            key={x.t}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " " || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c")) { e.preventDefault(); doCopy(); }
            }}
            className="flex flex-col rounded-xl border border-border bg-card p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{x.g}</p>
            <h2 className="mt-1 font-medium">{x.t}</h2>
            <p className="mt-2 flex-1 whitespace-pre-line text-sm text-muted-foreground">{x.x}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={doCopy}>
                <Copy className="size-4" /> Copiar mensaje
              </Button>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                o seleccioná y <Kbd>Enter</Kbd> / <Kbd>Ctrl</Kbd>+<Kbd>C</Kbd>
              </span>
            </div>
          </article>
          );
        })}
      </div>
      </>}
    </div>
  );
}
