import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ExternalLink,
  PartyPopper,
  Clock,
  Layers,
  ShieldCheck,
  Search,
  CalendarDays,
  TrendingUp,
  UserRound,
} from "lucide-react";

import {
  articlesQuery,
  bookmarksQuery,
  categoriesQuery,
  profileQuery,
  progressQuery,
  tintFor,
} from "@/lib/kb";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookmarkButton } from "@/components/bookmark-button";
import { cn } from "@/lib/utils";
import { SystemsHub } from "@/components/systems-hub";
import { AnnouncementsBoard } from "@/components/announcements-board";
import { BirthdayPanel } from "@/components/birthday-panel";
import { PADRONES } from "@/components/brand";
import { collectBirthdays, fichaQuery, staffDirectoryQuery, upcomingBirthdays } from "@/lib/staff";
import { OnboardingPath } from "@/components/onboarding-path";
import { TeamGoals } from "@/components/team-goals";
import { BankAccounts } from "@/components/bank-accounts";
import { OfficialLines } from "@/components/official-lines";
import { KudosWall } from "@/components/kudos-wall";
import { Gallery } from "@/components/gallery";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Inicio — Portal del Estudio Mansilla Garzón & Asoc." },
      {
        name: "description",
        content:
          "Novedades del estudio, accesos directos a los sistemas del día, padrones activos y tu checklist de capacitación.",
      },
      { property: "og:title", content: "Inicio — Portal del Estudio Mansilla Garzón & Asoc." },
      {
        property: "og:description",
        content: "Novedades, accesos rápidos, padrones y capacitación en un solo lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const QUICK = [
  { to: "/padrones", label: "Padrones", icon: Layers },
  { to: "/piso-deuda", label: "Piso de deuda", icon: ShieldCheck },
  { to: "/informacion", label: "Centro de información", icon: Search },
] as const;

const IMPORTANT = [
  { to: "/plantillas", label: "Acuerdo oficial de pago y medios permitidos" },
  { to: "/plantillas", label: "Protocolo de Constancias de Deuda" },
  { to: "/planes", label: "Tus planes de pago vencidos o por vencer" },
  { to: "/calendario", label: "Feriados, cumpleaños y vacaciones" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function Dashboard() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: articles = [], isLoading } = useQuery(articlesQuery);
  const { data: progress = [] } = useQuery(progressQuery);
  const { data: bookmarks = [] } = useQuery(bookmarksQuery);
  const { data: profile } = useQuery(profileQuery);

  const readIds = new Set(progress.map((p) => p.article_id));
  const required = articles.filter((a) => a.is_required);
  const done = required.filter((a) => readIds.has(a.id)).length;
  const pct = required.length ? Math.round((done / required.length) * 100) : 0;
  const complete = required.length > 0 && done === required.length;

  const next = required.filter((a) => !readIds.has(a.id)).slice(0, 3);
  const tools = articles.filter((a) => a.is_tool && a.external_url).slice(0, 4);
  const savedArticles = bookmarks
    .map((b) => articles.find((a) => a.id === b.article_id))
    .filter((a): a is (typeof articles)[number] => Boolean(a))
    .slice(0, 3);

  const { data: staff = [] } = useQuery(staffDirectoryQuery);
  const { data: ficha = null } = useQuery(fichaQuery);
  const birthdays = upcomingBirthdays(collectBirthdays(staff, ficha));
  const firstName = (profile?.full_name ?? "").trim().split(" ")[0];
  const fichaIncomplete =
    !ficha || !ficha.first_name || !ficha.whatsapp || !ficha.birth_day || !ficha.birth_month;

  return (
    <div className="space-y-10">
      {fichaIncomplete && (
        <Link
          to="/perfil"
          className="group flex items-center gap-4 rounded-2xl border-2 border-primary bg-primary/5 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <UserRound className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg leading-snug">
              Primero: completá tu ficha personal
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Nombre, WhatsApp, cumpleaños y usuario de GM. Toma 1 minuto y tus datos ya quedan
              cargados para todo el equipo.
            </span>
          </span>
          <ArrowRight
            className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      )}
      <section className="rise-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/70 p-6 text-primary-foreground shadow-lg md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 right-24 size-48 rounded-full bg-primary-foreground/10 blur-2xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="relative mt-1 font-display text-3xl leading-tight md:text-[2.4rem]">
          {greeting()}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="relative mt-2 max-w-2xl text-sm text-primary-foreground/85 md:text-base">
          ¡Qué bueno tenerte hoy en el equipo! Mirá las novedades, saludá a quien cumple años y arrancá con todo. ☀️
        </p>
        {required.length > 0 && (
          <p className="relative mt-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
            {complete ? "🎉 Completaste todas tus lecturas obligatorias" : `📚 Llevás ${done} de ${required.length} lecturas obligatorias`}
          </p>
        )}
        <div className="relative mt-5 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-primary-foreground/20"
            >
              <q.icon className="size-4" aria-hidden />
              {q.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[13fr_7fr]">
        <AnnouncementsBoard />
        <div className="space-y-6">
          <BirthdayPanel birthdays={birthdays} />
          <section className="surface p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <CalendarDays className="size-5 text-primary" aria-hidden /> Agenda del equipo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Feriados, cumpleaños y vacaciones programadas.
            </p>
            <Link
              to="/calendario"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Ver calendario <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>
        </div>
      </div>

      <section className="surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Sistema de escritorio Windows
        </p>
        <p className="mt-1 text-sm">
          Gestión de Mora (GM) se abre en tu puesto al iniciar sesión en Windows: no tiene acceso web.
        </p>
        <Link
          to="/article/$slug"
          params={{ slug: "manual-gestion-de-mora" }}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
        >
          Ver manual y criterios de carga <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <TeamGoals />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <KudosWall />
        <section className="surface p-5">
          <h2 className="font-display text-xl">Lo importante que tenés que saber</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {IMPORTANT.map((i) => (
              <li key={i.label}>
                <Link to={i.to} className="group flex items-center justify-between gap-2 rounded-lg border border-border p-3 hover:border-primary/40">
                  <span>{i.label}</span>
                  <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Gallery />

      <BankAccounts />

      <OfficialLines />

      <OnboardingPath />


      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <TrendingUp className="size-5 text-primary" aria-hidden /> Instancias de cartera
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ventana de recupero de tres meses. Cada instancia tiene su criterio de negociación.
        </p>
        <div className="mt-4 grid gap-4 stagger-children md:grid-cols-3">
          {PADRONES.map((p) => (
            <Link key={p.code} to="/padrones" className="surface surface-lift block p-5">
              <span
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-lg font-display text-sm font-bold",
                  p.className,
                )}
              >
                {p.code}
              </span>
              <p className="mt-3 text-sm font-semibold">{p.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <SystemsHub knownSlugs={new Set(articles.map((a) => a.slug))} />

      <section className="surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Checklist de capacitación</p>
            <p className="font-display text-2xl">
              {done} de {required.length} completadas
            </p>
          </div>
          <span className="font-display text-3xl text-primary">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-4" />

        {complete && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-n3 px-3 py-1.5 text-sm font-semibold text-n3-foreground">
            <PartyPopper className="size-4" aria-hidden />
            ¡Capacitación completa! Ya leíste todo lo obligatorio.
          </p>
        )}

        <ul className="mt-6 grid gap-3 stagger-children sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const items = required.filter((a) => a.category_id === category.id);
            const read = items.filter((a) => readIds.has(a.id)).length;
            const value = items.length ? Math.round((read / items.length) * 100) : 0;
            return (
              <li key={category.id} className="rounded-xl border border-border p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to="/category/$slug"
                    params={{ slug: category.slug }}
                    className="text-sm font-semibold hover:underline"
                  >
                    {category.name}
                  </Link>
                  <span
                    className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-semibold", tintFor(category.accent))}
                  >
                    {read}/{items.length}
                  </span>
                </div>
                <Progress value={value} className="mt-3 h-1.5" />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">Qué leer ahora</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Cargando tu ruta…</p>
        ) : next.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No queda lectura obligatoria pendiente. Podés explorar el material complementario en
            Capacitación.
          </p>
        ) : (
          <ul className="mt-4 space-y-3 stagger-children">
            {next.map((article) => (
              <li key={article.id} className="surface surface-lift flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/article/$slug"
                    params={{ slug: article.slug }}
                    className="font-semibold hover:underline"
                  >
                    {article.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.summary}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden />
                  {article.reading_minutes} min
                </span>
                <BookmarkButton articleId={article.id} />
                <Button asChild size="sm">
                  <Link to="/article/$slug" params={{ slug: article.slug }}>
                    Leer <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tools.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Accesos directos a herramientas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Abrí el sistema o consultá su guía paso a paso.
          </p>
          <ul className="mt-4 grid gap-3 stagger-children sm:grid-cols-2">
            {tools.map((tool) => (
              <li key={tool.id} className="surface surface-lift p-4">
                <p className="font-semibold">{tool.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tool.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={tool.external_url!} target="_blank" rel="noreferrer noopener">
                      {tool.external_label ?? "Abrir"} <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/article/$slug" params={{ slug: tool.slug }}>
                      Ver guía
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {savedArticles.length > 0 && (
        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl">Guardados recientes</h2>
            <Link to="/saved" className="text-sm underline hover:text-foreground">
              Ver todos
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 stagger-children sm:grid-cols-3">
            {savedArticles.map((article) => (
              <li key={article.id} className="surface surface-lift p-4">
                <Link
                  to="/article/$slug"
                  params={{ slug: article.slug }}
                  className="font-semibold hover:underline"
                >
                  {article.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
