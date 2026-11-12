import { Link } from "@tanstack/react-router";
import { ExternalLink, ArrowUpRight } from "lucide-react";

import { SYSTEMS } from "@/lib/systems";
import { Button } from "@/components/ui/button";

export function SystemsHub({ knownSlugs }: { knownSlugs?: Set<string> }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-xl md:text-2xl">Hub de Sistemas</h2>
        <p className="text-sm text-muted-foreground">
          Accesos directos a las plataformas del estudio.
        </p>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SYSTEMS.map((system) => {
          const hasGuide = system.articleSlug && (!knownSlugs || knownSlugs.has(system.articleSlug));
          return (
            <li
              key={system.name}
              className="flex flex-col rounded-lg border border-border bg-card p-4"
            >
              <p className="font-semibold leading-snug">{system.name}</p>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{system.purpose}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {system.url && (
                  <Button asChild size="sm">
                    <a href={system.url} target="_blank" rel="noreferrer noopener">
                      Abrir <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                )}
                {system.links?.map((link) => (
                  <Button key={link.url} asChild size="sm" variant="outline">
                    <a href={link.url} target="_blank" rel="noreferrer noopener">
                      {link.label} <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                ))}
                {hasGuide && (
                  <Button asChild size="sm" variant={system.url ? "outline" : "default"}>
                    <Link to="/article/$slug" params={{ slug: system.articleSlug! }}>
                      Ver manual
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
