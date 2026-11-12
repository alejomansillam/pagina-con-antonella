import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, CornerDownLeft, IdCard, UserRound, Megaphone, CalendarDays } from "lucide-react";

import { articlesQuery, categoriesQuery, searchArticles, tintFor } from "@/lib/kb";
import { cn } from "@/lib/utils";
import { SYSTEMS } from "@/lib/systems";
import { staffDirectoryQuery } from "@/lib/staff";
import { supabase } from "@/integrations/supabase/client";

export function InstantSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: articles = [] } = useQuery(articlesQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: staff = [] } = useQuery({ ...staffDirectoryQuery, enabled: open });
  const { data: news = [] } = useQuery({
    queryKey: ["search_announcements"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["search_calendar_events"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("calendar_events").select("id, title, note, event_date").order("event_date");
      return data ?? [];
    },
  });
  const eventHits = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (t.length < 3) return [];
    return events.filter((e) => (e.title + " " + (e.note ?? "")).toLowerCase().includes(t)).slice(0, 4);
  }, [events, term]);
  const results = useMemo(() => searchArticles(articles, term), [articles, term]);
  const dniTerm = term.replace(/[.\s-]/g, "");
  const isDni = /^\d{6,9}$/.test(dniTerm);
  const people = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (t.length < 2 || isDni) return [];
    return staff
      .filter((p) => !["direccion", "gerencia"].includes(p.kind) && [p.full_name, p.nickname, p.gm_username, p.team, p.role_title].join(" ").toLowerCase().includes(t))
      .slice(0, 5);
  }, [staff, term, isDni]);
  const newsHits = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (t.length < 3 || isDni) return [];
    return news.filter((n) => (n.title + " " + n.body).toLowerCase().includes(t)).slice(0, 4);
  }, [news, term, isDni]);
  const tools = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (t.length < 2) return [];
    const sections = [
      { name: "Padrones N1 / N2 / N3", purpose: "Consulta por DNI", to: "/padrones" },
      { name: "Plantillas y Campañas Chattigo", purpose: "Mensajes para copiar", to: "/plantillas" },
      { name: "Calculadora de deuda", purpose: "Capital, intereses y honorarios", to: "/calculadora" },
      { name: "Libre de deuda", purpose: "Constancias", to: "/constancias" },
      { name: "Agenda del estudio", purpose: "Contactos e internos", to: "/directorio" },
      { name: "Equipos", purpose: "Rojo, Verde, Azul y 1142", to: "/equipos" },
      { name: "Planes de pago", purpose: "Vencimientos y cuotas", to: "/planes" },
      { name: "Calendario", purpose: "Feriados, cumpleaños y vacaciones", to: "/calendario" as string },
    ];
    const s = sections.filter((x) => (x.name + x.purpose).toLowerCase().includes(t)).map((x) => ({ ...x, url: undefined as string | undefined }));
    const sys = SYSTEMS.filter((x) => (x.name + x.purpose).toLowerCase().includes(t)).map((x) => ({
      name: x.name,
      purpose: x.purpose,
      url: x.url,
      to: x.url ? undefined : x.articleSlug ? `/article/${x.articleSlug}` : undefined,
    }));
    return [...s, ...sys].slice(0, 6);
  }, [term]);

  const close = () => {
    setOpen(false);
    setTerm("");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => setActive(0), [term]);

  const go = (slug: string) => {
    setOpen(false);
    setTerm("");
    navigate({ to: "/article/$slug", params: { slug } });
  };

  const categoryOf = (id: string) => categories.find((c) => c.id === id);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!results.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((a) => (a - 1 + results.length) % results.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const target = results[active];
              if (target) go(target.slug);
            }
          }}
          type="search"
          placeholder="Buscar manuales, personas, novedades o un DNI"
          aria-label="Buscar artículos"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </div>

      {open && term.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
          {isDni && (
            <button
              type="button"
              onClick={() => {
                close();
                navigate({ to: "/padrones", search: { dni: dniTerm } });
              }}
              className="flex w-full items-center gap-3 border-b border-border bg-secondary/40 px-4 py-3 text-left hover:bg-secondary"
            >
              <IdCard className="size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">Abrir ficha del DNI {dniTerm}</span>
                <span className="text-xs text-muted-foreground">Buscar en padrones 1135 y 1142</span>
              </span>
            </button>
          )}
          {people.length > 0 && (
            <ul className="border-b border-border py-1">
              <li className="px-4 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Personas</li>
              {people.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      navigate({ to: "/directorio" });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-secondary/60"
                  >
                    <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[p.role_title, p.team, p.microsip_ext && `Int. ${p.microsip_ext}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {newsHits.length > 0 && (
            <ul className="border-b border-border py-1">
              <li className="px-4 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Novedades</li>
              {newsHits.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      navigate({ to: "/dashboard" });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-secondary/60"
                  >
                    <Megaphone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{n.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {eventHits.length > 0 && (
            <ul className="border-b border-border py-1">
              <li className="px-4 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Eventos</li>
              {eventHits.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => { close(); navigate({ to: "/calendario", search: { fecha: e.event_date } }); }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-secondary/60"
                  >
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{e.event_date.split("-").reverse().join("/")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tools.length > 0 && (
            <ul className="border-b border-border py-1">
              <li className="px-4 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Herramientas</li>
              {tools.map((t) => (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setTerm("");
                      if (t.url) window.open(t.url, "_blank", "noopener");
                      else if (t.to) navigate({ to: t.to });
                    }}
                    className="flex w-full flex-col px-4 py-2 text-left hover:bg-secondary/60"
                  >
                    <span className="text-sm font-semibold">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.purpose}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {results.length === 0 ? (
            tools.length === 0 && people.length === 0 && newsHits.length === 0 && eventHits.length === 0 && !isDni && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin resultados para “{term}”.
            </p>
            )
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto py-1">
              {results.map((article, index) => {
                const category = categoryOf(article.category_id);
                return (
                  <li key={article.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(article.slug)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                        index === active ? "bg-secondary" : "hover:bg-secondary/60",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{article.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{article.summary}</p>
                      </div>
                      {category && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold",
                            tintFor(category.accent),
                          )}
                        >
                          {category.name}
                        </span>
                      )}
                      {index === active && (
                        <CornerDownLeft className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
