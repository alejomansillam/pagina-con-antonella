import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  LibraryBig,
  BookmarkCheck,
  LogOut,
  Layers,
  MessageSquareText,
  Calculator,
  FileCheck2,
  Contact,
  UserRound,
  ShieldCheck,
  Users,
  Sparkles,
  Lightbulb,
  Menu,
  CalendarClock,
  CalendarDays,
  BarChart3,
  HeartHandshake,
  Search,
  Globe,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/kb";
import { NotificationsBell } from "@/components/notifications-bell";
import { myRolesQuery } from "@/lib/roles";
import { unreadQuery } from "@/lib/internal-chat";
import { InstantSearch } from "@/components/instant-search";
import { PortalGuide } from "@/components/portal-guide";
import { AssistantWidget } from "@/components/assistant-widget";
import { BrandLock } from "@/components/brand";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Comunidad",
    items: [
      { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, hint: "Novedades, cumpleaños y reconocimientos" },
      { to: "/comunidad", label: "Comunidad", icon: HeartHandshake, hint: "Avisos, saludos y equipo" },
    ],
  },
  {
    label: "Información",
    items: [
      { to: "/informacion", label: "Centro de información", icon: Search, hint: "Criterios, acuerdos, cuentas y preguntas" },
      { to: "/browse", label: "Capacitación", icon: LibraryBig, hint: "Manuales operativos" },
      { to: "/institucional", label: "Bienvenida", icon: Sparkles, hint: "Cultura, Día 1 y Quién es Quién" },
      { to: "/saved", label: "Guardados", icon: BookmarkCheck, hint: "Tus marcados" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { to: "/padrones", label: "Padrones", icon: Layers, hint: "Buscar por DNI y cargar Excel" },
      { to: "/planes", label: "Planes de pago", icon: CalendarClock, hint: "Seguimiento, alertas y vencimientos" },
      { to: "/plantillas", label: "Plantillas", icon: MessageSquareText, hint: "Diarias y campañas de Chattigo" },
      { to: "/calculadora", label: "Calculadora", icon: Calculator, hint: "Discriminar deuda" },
      { to: "/piso-deuda", label: "Piso de deuda", icon: ShieldCheck, hint: "Uso interno" },
      { to: "/constancias", label: "Libre deuda", icon: FileCheck2, hint: "Emitir constancias" },
      { to: "/resumen", label: "Resumen de Gestión", icon: BarChart3, hint: "Tablero: KPIs, ranking y evolución" },
    ],
  },
  {
    label: "Equipos y agenda",
    items: [
      { to: "/equipos", label: "Equipos", icon: Users, hint: "Rojo, Verde, Azul y 1142" },
      { to: "/calendario", label: "Calendario", icon: CalendarDays, hint: "Feriados, cumpleaños y vacaciones" },
      { to: "/directorio", label: "Agenda", icon: Contact, hint: "Internos y WhatsApp" },
      { to: "/perfil", label: "Mi ficha", icon: UserRound, hint: "Tus datos y cumpleaños" },
    ],
  },
  {
    label: "Sugerencias",
    items: [
      { to: "/sugerencias", label: "Sugerencias", icon: Lightbulb, hint: "Buzón interno" },
    ],
  },
] as const;

const MENUS = [
  { label: "Información", items: GROUPS[1].items },
  { label: "Herramientas", items: GROUPS[2].items },
   { label: "Equipo y agenda", items: [GROUPS[0].items[1], { to: "/chat", label: "Chat interno", icon: MessageSquareText, hint: "Mensajes privados y grupos del equipo" }, ...GROUPS[3].items] },
] as const;

const WEB = "https://www.mansillayasoc.com.ar/";

const linkClass =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-foreground/20 px-3.5 py-1.5 text-sm font-medium text-ink-foreground/75 transition-all duration-200 hover:border-ink-foreground/40 hover:bg-ink-foreground/10 hover:text-ink-foreground max-sm:w-[calc(50%-0.375rem)] max-sm:justify-center [&.active]:border-background [&.active]:bg-background [&.active]:font-semibold [&.active]:text-foreground [&.active]:shadow-md";

const drawerLinkClass =
  "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary [&.active]:bg-primary [&.active]:text-primary-foreground";

export function PortalShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: unreadMap = {} } = useQuery({ ...unreadQuery, enabled: !!profile });
  const unread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (!profile) return;
    const channel = supabase.channel("internal-chat-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_chat_messages" }, () => queryClient.invalidateQueries({ queryKey: unreadQuery.queryKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_chat_reads" }, () => queryClient.invalidateQueries({ queryKey: unreadQuery.queryKey }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile, queryClient]);
  const badge = (n: number) => n > 0 ? <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-5 text-destructive-foreground" aria-label={`${n} mensajes sin leer`}>{n > 99 ? "99+" : n}</span> : null;

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  };

  const fullName = (profile?.full_name ?? "").trim();
  const firstName = fullName.split(" ")[0];
  const isAdmin = roles.includes("admin");
  const roleLabel = isAdmin ? "Admin" : roles.includes("senior") ? "Senior" : "Gestor";

  return (
    <div className="min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent)] print:hidden"
      />
      <header className="sticky top-0 z-40 border-b-2 border-border bg-card shadow-md print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3.5 md:gap-5">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-4" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-[19rem] overflow-y-auto p-0">
              <div className="border-b border-border py-4 pl-5 pr-12">
                <SheetTitle className="text-left">
                  <BrandLock />
                </SheetTitle>
                {fullName && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {fullName} · <span className="font-semibold">{roleLabel}</span>
                  </p>
                )}
              </div>
              <nav className="space-y-1 px-3 py-4">
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className={drawerLinkClass} activeProps={{ className: "active" }}>
                  <LayoutDashboard className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Inicio</span>
                </Link>
                {MENUS.map((menu) => (
                  <details key={menu.label} className="group rounded-lg">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-secondary">
                      {menu.label}{menu.label === "Equipo y agenda" && badge(unread)}
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="space-y-0.5 pb-1 pl-2">
                      {menu.items.map((item) => (
                        <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={drawerLinkClass} activeProps={{ className: "active" }}>
                          <item.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                          <span>
                            {item.label}{item.to === "/chat" && badge(unread)}
                            <span className="block text-xs font-normal opacity-70">{item.hint}</span>
                          </span>
                        </Link>
                      ))}
                      {isAdmin && menu.label === "Equipo y agenda" && (
                        <Link to="/accesos" onClick={() => setMenuOpen(false)} className={drawerLinkClass} activeProps={{ className: "active" }}>
                          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                          <span>
                            Accesos y permisos
                            <span className="block text-xs font-normal opacity-70">Roles del equipo (solo Admin)</span>
                          </span>
                        </Link>
                      )}
                    </div>
                  </details>
                ))}
                <Link to="/sugerencias" onClick={() => setMenuOpen(false)} className={drawerLinkClass} activeProps={{ className: "active" }}>
                  <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Sugerencias</span>
                </Link>
                <a href={WEB} target="_blank" rel="noopener noreferrer" className={drawerLinkClass}>
                  <Globe className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Web oficial del estudio</span>
                </a>
              </nav>
            </SheetContent>
          </Sheet>

          <BrandLock to="/dashboard" />
          <InstantSearch className="order-last w-full sm:order-none sm:w-auto sm:min-w-0 sm:flex-1" />
          <div className="flex shrink-0 items-center gap-2">
            {fullName && (
              <span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs md:inline-flex">
                <span className="grid size-6 place-items-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground">
                  {fullName.slice(0, 1).toUpperCase()}
                </span>
                <span className="font-semibold">{firstName}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-secondary-foreground">
                  {roleLabel}
                </span>
              </span>
            )}
            <NotificationsBell />
            <PortalGuide />
            <AssistantWidget />
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        <div className="hidden bg-ink text-ink-foreground shadow-inner lg:block">
          <div className="mx-auto max-w-6xl px-4">
            <nav className="flex items-center gap-1.5 py-2.5">
              <Link to="/dashboard" className={linkClass} activeProps={{ className: "active" }}>
                <LayoutDashboard className="size-4" aria-hidden />
                <span>Inicio</span>
              </Link>
              {MENUS.map((menu) => (
                <DropdownMenu key={menu.label}>
                  <DropdownMenuTrigger className={cn(linkClass, "data-[state=open]:bg-ink-foreground/10")}>
                    <span>{menu.label}</span>{menu.label === "Equipo y agenda" && badge(unread)}
                    <ChevronDown className="size-3.5" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72 p-1.5">
                    {menu.items.map((item) => (
                      <DropdownMenuItem key={item.to} asChild className="cursor-pointer items-start gap-3 py-2">
                        <Link to={item.to}>
                          <item.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                          <span>
                            <span className="block font-medium">{item.label}{item.to === "/chat" && badge(unread)}</span>
                            <span className="block text-xs text-muted-foreground">{item.hint}</span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    {isAdmin && menu.label === "Equipo y agenda" && (
                      <DropdownMenuItem asChild className="cursor-pointer items-start gap-3 border-t border-border py-2">
                        <Link to="/accesos">
                          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                          <span>
                            <span className="block font-medium">Accesos y permisos</span>
                            <span className="block text-xs text-muted-foreground">Roles del equipo (solo Admin)</span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
              <Link to="/sugerencias" className={linkClass} activeProps={{ className: "active" }}>
                <Lightbulb className="size-4" aria-hidden />
                <span>Sugerencias</span>
              </Link>
              <a href={WEB} target="_blank" rel="noopener noreferrer" className={cn(linkClass, "ml-auto")}>
                <Globe className="size-4" aria-hidden />
                <span>Web oficial</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Mansilla Garzón & Asoc.</span>
          <a href={WEB} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
            <Globe className="size-4" aria-hidden />
            www.mansillayasoc.com.ar
          </a>
        </div>
      </footer>
    </div>
  );
}
