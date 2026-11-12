import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Cake, Network, Sparkles } from "lucide-react";

import { KudosWall } from "@/components/kudos-wall";
import { AnnouncementsBoard } from "@/components/announcements-board";
import { BirthdayPanel } from "@/components/birthday-panel";
import { Gallery } from "@/components/gallery";
import { collectBirthdays, fichaQuery, staffDirectoryQuery, upcomingBirthdays } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/comunidad")({
  head: () => ({
    meta: [
      { title: "Comunidad — Portal del Estudio Mansilla Garzón & Asoc." },
      {
        name: "description",
        content:
          "Novedades, reconocimientos entre compañeros, cumpleaños y presentación de los equipos del estudio.",
      },
      { property: "og:title", content: "Comunidad — Mansilla Garzón & Asoc." },
      {
        property: "og:description",
        content: "Muro social del estudio: avisos, reconocimientos, cumpleaños y equipos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Comunidad,
});

const TEAM_BLURBS: Record<string, string> = {
  gerencia: "Baja la información de Naranja y define la estrategia mensual del estudio.",
  supervision: "Acompaña la operación diaria, autoriza excepciones y controla los padrones.",
  senior: "Comanda los equipos de gestores y resuelve las consultas del día a día.",
  gestor: "Gestión directa de la cartera extrajudicial: contacto, acuerdos y seguimiento.",
};

function Comunidad() {
  const { data: staff = [] } = useQuery(staffDirectoryQuery);
  const { data: ficha = null } = useQuery(fichaQuery);
  const birthdays = upcomingBirthdays(collectBirthdays(staff, ficha));

  const groups = new Map<string, typeof staff>();
  for (const s of staff) {
    const key = s.team?.trim() || s.kind || "gestor";
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  const teams = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-10">
      <section className="ink-panel rise-in p-7 md:p-9">
        <p className="inline-flex items-center gap-2 rounded-full bg-ink-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
          <Sparkles className="size-3.5" aria-hidden /> La comunidad del estudio
        </p>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">Novedades, equipo y reconocimientos</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-foreground/75 md:text-base">
          Un solo lugar para enterarte de lo que pasa en el estudio, conocer a quiénes trabajan en
          cada área y agradecer a los compañeros.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/institucional" className="inline-flex items-center gap-2 rounded-full bg-ink-foreground px-4 py-2 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5">
            <Network className="size-4" aria-hidden /> Quién es Quién
          </Link>
          <Link
            to="/directorio"
            className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/25 px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink-foreground/10"
          >
            <Users className="size-4" aria-hidden /> Agenda de contactos
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <AnnouncementsBoard />
        <BirthdayPanel birthdays={birthdays} />
      </div>

      <KudosWall />

      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Users className="size-5 text-primary" aria-hidden /> Conociendo al equipo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quiénes integran cada área. Ideal para los nuevos ingresos.
        </p>
        <div className="mt-4 grid gap-4 stagger-children md:grid-cols-2 lg:grid-cols-3">
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay integrantes cargados en la agenda.</p>
          )}
          {teams.map(([team, members]) => (
            <article key={team} className="surface surface-lift p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg capitalize">{team}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {members.length}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {TEAM_BLURBS[members[0]?.kind ?? "gestor"] ?? TEAM_BLURBS["gestor"]}
              </p>
              <ul className="mt-3 space-y-1.5">
                {members.slice(0, 8).map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">
                      {m.full_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{m.nickname || m.full_name}</span>
                    {m.role_title && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{m.role_title}</span>
                    )}
                  </li>
                ))}
                {members.length > 8 && (
                  <li className="text-xs text-muted-foreground">y {members.length - 8} más…</li>
                )}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="flex items-center gap-2 font-display text-xl">
          <Cake className="size-5 text-primary" aria-hidden /> Galería social
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Fotos de eventos internos, desayunos de trabajo y cierres de mes. Cualquier persona del
          equipo puede subir las suyas.
        </p>
        <div className="mt-4">
          <Gallery />
        </div>
      </section>
    </div>
  );
}
