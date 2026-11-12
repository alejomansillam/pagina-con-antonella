import { useCallback } from "react";
import { Cake, PartyPopper, MessageCircle, Sparkles } from "lucide-react";

import { MONTHS, isToday, upcomingBirthdays, daysUntil, waLink, type Birthday } from "@/lib/staff";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function throwConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  const end = Date.now() + 1200;
  const colors = ["#2B3E5C", "#D4AF37", "#ffffff", "#8FA3C0"];
  confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors });
  const frame = () => {
    confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function firstName(name: string) {
  return name.trim().split(" ")[0] || name;
}

export function BirthdayPanel({
  birthdays,
  className,
  limit = 6,
}: {
  birthdays: Birthday[];
  className?: string;
  limit?: number;
}) {
  const today = birthdays.filter((b) => isToday(b));
  const next = upcomingBirthdays(birthdays)
    .filter((b) => !isToday(b))
    .slice(0, limit);

  const celebrate = useCallback(() => {
    void throwConfetti();
  }, []);

  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Cake className="size-5 text-primary" aria-hidden />
        Cumpleaños del equipo
      </h2>

      {today.length > 0 && (
        <div className="mt-4 space-y-3">
          {today.map((b) => {
            const nombre = firstName(b.name);
            return (
              <div
                key={b.id}
                className="relative overflow-hidden rounded-xl border-2 border-[#D4AF37]/70 bg-gradient-to-br from-[#D4AF37]/15 via-card to-primary/10 p-4 shadow-[0_0_0_1px_rgba(212,175,55,0.25),0_10px_30px_-12px_rgba(212,175,55,0.45)]"
              >
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Sparkles className="size-3.5" aria-hidden /> Hoy festejamos
                </p>
                <p className="mt-2 flex items-center gap-2 font-display text-xl font-bold">
                  <span aria-hidden className="text-2xl">
                    🎂
                  </span>
                  ¡Hoy celebramos a {nombre}!
                </p>
                {b.role ? <p className="mt-0.5 text-sm text-muted-foreground">{b.role}</p> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={celebrate}>
                    <PartyPopper className="size-4" aria-hidden /> ¡Saludar a {nombre}! 🥳
                  </Button>
                  {b.whatsapp ? (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`${waLink(b.whatsapp)}?text=${encodeURIComponent(
                          `¡Feliz cumpleaños ${nombre}! 🎉 Que tengas un excelente día de parte de todo el equipo de Mansilla Garzón & Asoc.`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="size-4" aria-hidden /> Enviar saludo por WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {next.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {next.map((b) => {
            const d = daysUntil(b);
            return (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-paper px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{b.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {b.day} de {MONTHS[b.month - 1]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
                      d <= 7 ? "bg-primary/10 text-primary" : "text-muted-foreground",
                    )}
                  >
                    {d === 1 ? "mañana" : `en ${d} días`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        today.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Todavía no hay cumpleaños cargados. Completá tu fecha en Mi ficha para aparecer acá.
          </p>
        )
      )}
    </section>
  );
}
