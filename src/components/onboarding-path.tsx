import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  Compass,
  ExternalLink,
  HeartHandshake,
  IdCard,
  ListChecks,
} from "lucide-react";

import {
  BUDDIES,
  CHECKPOINT,
  ONBOARDING_STEPS,
  PRACTICE_CASE,
  readOnboarding,
  writeOnboarding,
  type OnboardingState,
} from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function OnboardingPath({ className }: { className?: string }) {
  const [state, setState] = useState<OnboardingState>({ days: [], checkpoint: [] });

  useEffect(() => {
    setState(readOnboarding());
  }, []);

  const update = (next: OnboardingState) => {
    setState(next);
    writeOnboarding(next);
  };

  const toggleDay = (day: number) => {
    const days = state.days.includes(day)
      ? state.days.filter((d) => d !== day)
      : [...state.days, day];
    update({ ...state, days });
  };

  const toggleCheck = (i: number) => {
    const checkpoint = state.checkpoint.includes(i)
      ? state.checkpoint.filter((c) => c !== i)
      : [...state.checkpoint, i];
    update({ ...state, checkpoint });
  };

  const pct = Math.round((state.days.length / ONBOARDING_STEPS.length) * 100);
  const checkPct = Math.round((state.checkpoint.length / CHECKPOINT.length) * 100);

  return (
    <section className={cn("space-y-5", className)}>
      <div className="surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Primera semana
            </p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-2xl">
              <Compass className="size-5 text-primary" aria-hidden /> Ruta de inducción para nuevos
              ingresos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cinco días guiados. Marcá cada día cuando lo termines y seguí tu avance.
            </p>
          </div>
          <div className="min-w-[180px]">
            <p className="text-right font-display text-3xl font-bold">{pct}%</p>
            <Progress value={pct} className="mt-2" />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {state.days.length} de {ONBOARDING_STEPS.length} días completados
            </p>
          </div>
        </div>

        <ol className="mt-6 grid gap-4 stagger-children lg:grid-cols-2">
          {ONBOARDING_STEPS.map((step) => {
            const done = state.days.includes(step.day);
            return (
              <li
                key={step.day}
                className={cn(
                  "rounded-xl border p-5 transition-colors",
                  done ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border font-display text-sm font-bold">
                    D{step.day}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{step.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{step.focus}</p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {step.tasks.map((t) => (
                    <li key={t} className="flex gap-2 text-sm">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                {step.links.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {step.links.map((l) => {
                      const cls =
                        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted";
                      if (l.articleSlug)
                        return (
                          <Link
                            key={l.label}
                            to="/article/$slug"
                            params={{ slug: l.articleSlug }}
                            className={cls}
                          >
                            {l.label}
                          </Link>
                        );
                      if (l.to)
                        return (
                          <Link key={l.label} to={l.to} className={cls}>
                            {l.label}
                          </Link>
                        );
                      return (
                        <a
                          key={l.label}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className={cls}
                        >
                          {l.label} <ExternalLink className="size-3" aria-hidden />
                        </a>
                      );
                    })}
                  </div>
                )}

                <Button
                  size="sm"
                  variant={done ? "secondary" : "default"}
                  className="mt-4 w-full"
                  onClick={() => toggleDay(step.day)}
                >
                  {done ? (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden /> Día completado
                    </>
                  ) : (
                    <>
                      <Circle className="size-4" aria-hidden /> Marcar día completado
                    </>
                  )}
                </Button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <IdCard className="size-5 text-primary" aria-hidden /> Caso de práctica
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{PRACTICE_CASE.nota}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-paper p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                DNI de prueba
              </dt>
              <dd className="mt-1 font-display text-lg font-bold">{PRACTICE_CASE.dni}</dd>
            </div>
            <div className="rounded-lg border border-border bg-paper p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Instancia
              </dt>
              <dd className="mt-1 font-display text-lg font-bold">{PRACTICE_CASE.instancia}</dd>
            </div>
            <div className="rounded-lg border border-border bg-paper p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Titular
              </dt>
              <dd className="mt-1 font-medium">{PRACTICE_CASE.titular}</dd>
            </div>
            <div className="rounded-lg border border-border bg-paper p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Saldo simulado
              </dt>
              <dd className="mt-1 font-medium">{PRACTICE_CASE.saldo}</dd>
            </div>
          </dl>
          <Button size="sm" variant="outline" className="mt-4" asChild>
            <Link to="/padrones">Buscarlo en Padrones</Link>
          </Button>
        </div>

        <div className="surface p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <HeartHandshake className="size-5 text-primary" aria-hidden /> Tu referente de consulta
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada ingreso tiene una senior de referencia durante la primera semana.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {BUDDIES.map((b) => (
              <li key={b.name} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{b.name}</span>
                  <span className="block text-xs text-muted-foreground">{b.role}</span>
                </span>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {b.team}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <ListChecks className="size-5 text-primary" aria-hidden /> Checkpoint del 5.º día
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cinco confirmaciones antes de recibir la cartera definitiva.
            </p>
          </div>
          <span className="text-sm font-semibold">
            {state.checkpoint.length}/{CHECKPOINT.length}
          </span>
        </div>
        <Progress value={checkPct} className="mt-3" />
        <ul className="mt-4 space-y-2">
          {CHECKPOINT.map((q, i) => {
            const ok = state.checkpoint.includes(i);
            return (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => toggleCheck(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                    ok ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span>{q}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {state.checkpoint.length === CHECKPOINT.length && (
          <p className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm font-medium">
            Checkpoint completo. Avisale a tu referente para que te asignen la cartera definitiva.
          </p>
        )}
      </div>
    </section>
  );
}
