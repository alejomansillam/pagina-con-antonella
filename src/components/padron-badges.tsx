import { PADRONES } from "@/components/brand";
import { cn } from "@/lib/utils";

export function PadronBadges() {
  return (
    <section>
      <h2 className="font-display text-xl md:text-2xl">Padrones activos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estrategia de negociación según el mes de gestión de la cuenta.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {PADRONES.map((padron) => (
          <li key={padron.code} className="rounded-lg border border-border bg-card p-4">
            <span
              className={cn(
                "inline-flex items-center rounded px-2 py-0.5 text-xs font-bold tracking-wide",
                padron.className,
              )}
            >
              {padron.code}
            </span>
            <p className="mt-2 text-sm font-semibold">{padron.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{padron.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
