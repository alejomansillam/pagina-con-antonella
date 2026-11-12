import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle, Phone, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BirthdayPanel } from "@/components/birthday-panel";
import {
  collectBirthdays,
  fichaQuery,
  prettyPhone,
  staffDirectoryQuery,
  waLink,
  type StaffEntry,
} from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/directorio")({
  head: () => ({
    meta: [
      { title: "Agenda del estudio — Mansilla Garzón & Asoc." },
      {
        name: "description",
        content:
          "Contactos de todo el estudio: internos de MicroSIP, WhatsApp corporativo, usuario de Gestión de Mora y cumpleaños del equipo.",
      },
      { property: "og:title", content: "Agenda del estudio — Mansilla Garzón & Asoc." },
      {
        property: "og:description",
        content: "Internos, WhatsApp, usuarios de gestión y cumpleaños de todo el equipo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DirectorioPage,
});

const GROUP_ORDER = [
  { key: "supervision", label: "Supervisión", kinds: ["supervision"] },
  { key: "gestion", label: "Equipo de gestión", kinds: ["senior", "gestor"] },
  { key: "areas", label: "Áreas y administración", kinds: ["area"] },
  { key: "lineas", label: "Líneas del estudio", kinds: ["linea"] },
] as const;

function DirectorioPage() {
  const { data: staff = [], isLoading } = useQuery(staffDirectoryQuery);
  const { data: ficha } = useQuery(fichaQuery);
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    const visible = staff.filter((s) => !["direccion", "gerencia"].includes(s.kind));
    if (!q) return visible;
    return visible.filter((s) =>
      [s.full_name, s.nickname, s.gm_username, s.microsip_ext, s.whatsapp, s.role_title, s.team]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [staff, term]);

  const birthdays = useMemo(() => collectBirthdays(staff, ficha ?? null), [staff, ficha]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Equipo y comunicación
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">Agenda del estudio</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Todos los contactos internos en un solo lugar: interno de MicroSIP, WhatsApp
            corporativo y usuario de Gestión de Mora.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/perfil">
            <UserRound className="size-4" aria-hidden />
            Mi ficha
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nombre, interno, usuario de GM o equipo…"
          className="pl-9"
          aria-label="Buscar contactos del estudio"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando la agenda…</p>}
          {GROUP_ORDER.map((group) => {
            const rows = filtered.filter((s) => (group.kinds as readonly string[]).includes(s.kind));
            if (rows.length === 0) return null;
            return (
              <section key={group.key}>
                <h2 className="font-display text-lg font-bold">{group.label}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {rows.map((entry) => (
                    <ContactCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No encontramos contactos que coincidan con “{term}”.
            </p>
          )}
        </div>

        <BirthdayPanel birthdays={birthdays} className="h-fit lg:sticky lg:top-24" limit={8} />
      </div>
    </div>
  );
}

function ContactCard({ entry }: { entry: StaffEntry }) {
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-display text-base font-bold leading-tight">{entry.full_name}</h3>
      {entry.role_title && (
        <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
          {entry.role_title}
        </p>
      )}

      <dl className="mt-3 space-y-1.5 text-sm">
        {entry.microsip_ext && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Interno</dt>
            <dd className="flex items-center gap-1 font-medium tabular-nums">
              {entry.microsip_ext}
              <button
                type="button"
                onClick={() => copy(entry.microsip_ext!, "Interno")}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={`Copiar interno de ${entry.full_name}`}
              >
                <Copy className="size-3.5" aria-hidden />
              </button>
            </dd>
          </div>
        )}
        {entry.gm_username && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Usuario GM</dt>
            <dd className="flex items-center gap-1 font-medium">
              {entry.gm_username}
              <button
                type="button"
                onClick={() => copy(entry.gm_username!, "Usuario de GM")}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={`Copiar usuario de GM de ${entry.full_name}`}
              >
                <Copy className="size-3.5" aria-hidden />
              </button>
            </dd>
          </div>
        )}
        {entry.internal_email && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Correo</dt>
            <dd className="truncate font-medium">
              <a href={`mailto:${entry.internal_email}`} className="hover:underline">
                {entry.internal_email}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {(entry.whatsapp || entry.whatsapp_alt) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[entry.whatsapp, entry.whatsapp_alt].filter(Boolean).map((num, i) => (
            <Button key={num} asChild size="sm" variant={i === 0 ? "default" : "outline"}>
              <a href={waLink(num!)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" aria-hidden />
                {prettyPhone(num!)}
              </a>
            </Button>
          ))}
        </div>
      )}

      {!entry.whatsapp && !entry.whatsapp_alt && entry.microsip_ext && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="size-3.5" aria-hidden />
          Contacto por interno del softphone
        </p>
      )}
    </article>
  );
}
