import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BookOpen, CalendarDays, Megaphone, PartyPopper } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { articlesQuery, progressQuery } from "@/lib/kb";
import { collectBirthdays, fichaQuery, isToday, staffDirectoryQuery } from "@/lib/staff";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SEEN_KEY = "notif-seen-at";
const DISMISS_KEY = "notif-dismissed";
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Item = { id: string; icon: typeof Bell; title: string; detail: string; to: string; search?: Record<string, string>; fresh: boolean };

export function NotificationsBell() {
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSeenAt(localStorage.getItem(SEEN_KEY));
    try { setDismissed(new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]"))); } catch { /* vacío */ }
    setReady(true);
  }, []);

  const { data: anns = [] } = useQuery({
    queryKey: ["notif_announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("id,title,created_at").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const { data: events = [] } = useQuery({
    queryKey: ["notif_events", iso(today)],
    queryFn: async () => {
      const { data } = await supabase.from("calendar_events").select("id,title,event_date,end_date,start_time")
        .lte("event_date", iso(tomorrow)).or(`end_date.gte.${iso(today)},event_date.gte.${iso(today)}`).order("event_date");
      return data ?? [];
    },
  });
  const { data: staff = [] } = useQuery(staffDirectoryQuery);
  const { data: ficha = null } = useQuery(fichaQuery);
  const { data: articles = [] } = useQuery(articlesQuery);
  const { data: progress = [] } = useQuery(progressQuery);

  const read = new Set(progress.map((p) => p.article_id));
  const pending = articles.filter((a) => a.is_required && !read.has(a.id));
  const bdays = collectBirthdays(staff, ficha).filter((b) => isToday(b));

  const items: Item[] = [
    ...anns.map((a) => ({ id: "a" + a.id, icon: Megaphone, title: a.title, detail: "Nueva publicación en Novedades", to: "/dashboard", fresh: !seenAt || a.created_at > seenAt })),
    ...events.map((e) => ({
      id: "e" + e.id + iso(today), icon: CalendarDays, title: e.title,
      detail: (e.event_date <= iso(today) ? "Agenda de hoy" : "Agenda de mañana") + (e.start_time ? ` · ${e.start_time.slice(0, 5)} hs` : ""),
      to: "/calendario", search: { fecha: e.event_date }, fresh: true,
    })),
    ...bdays.map((b) => ({ id: "b" + b.id + iso(today), icon: PartyPopper, title: `Hoy es el cumpleaños de ${b.name}`, detail: "Enviale tu saludo", to: "/dashboard", fresh: true })),
    ...(pending.length ? [{ id: "r" + pending.length + iso(today), icon: BookOpen, title: pending.length > 1 ? `Tenés ${pending.length} lecturas obligatorias por completar` : "Tenés una lectura obligatoria por completar", detail: `Próxima: ${pending[0]!.title}`, to: "/browse", fresh: true }] : []),
  ];
  const visible = items.filter((i) => !dismissed.has(i.id));
  const dismiss = (ids: string[]) => {
    const next = new Set([...dismissed, ...ids]);
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...next].slice(-300)));
  };
  const count = ready ? visible.filter((i) => i.fresh).length : 0;

  const markSeen = (open: boolean) => {
    if (!open) return;
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setTimeout(() => setSeenAt(now), 1500);
  };

  return (
    <Popover onOpenChange={markSeen}>
      <PopoverTrigger
        aria-label={count ? `Notificaciones, ${count} nuevas` : "Notificaciones"}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-base">Notificaciones</p>
          {visible.length > 0 && (
            <button type="button" onClick={() => dismiss(visible.map((i) => i.id))} className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              Marcar todas como leídas
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Estás al día. No tenés notificaciones pendientes.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {visible.map((i) => (
              <li key={i.id}>
                <Link to={i.to} search={i.search as never} onClick={() => dismiss([i.id])} className="flex items-start gap-3 px-4 py-2.5 hover:bg-secondary">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <i.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.detail}</span>
                  </span>
                  {i.fresh && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Nueva" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
