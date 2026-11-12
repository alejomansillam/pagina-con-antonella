import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Target } from "lucide-react";

import { articlesQuery, categoriesQuery, progressQuery, tintFor } from "@/lib/kb";
import { cn } from "@/lib/utils";
import { OnboardingPath } from "@/components/onboarding-path";


export const Route = createFileRoute("/_authenticated/browse")({
  head: () => ({
    meta: [
      { title: "Secciones de la base de conocimiento — Portal del Estudio · Mansilla Garzón" },
      {
        name: "description",
        content:
          "Bienvenida, Cultura, Procesos Operativos, Herramientas Clave y FAQs: cada sección con su objetivo de aprendizaje y sus artículos.",
      },
      { property: "og:title", content: "Secciones de la base de conocimiento — Portal del Estudio · Mansilla Garzón" },
      {
        property: "og:description",
        content: "Cinco secciones con objetivos de onboarding explícitos y todos sus artículos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Browse,
});

function Browse() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: articles = [] } = useQuery(articlesQuery);
  const { data: progress = [] } = useQuery(progressQuery);
  const readIds = new Set(progress.map((p) => p.article_id));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">Base de conocimiento</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Cinco secciones. Cada una declara qué deberías aprender o lograr al terminarla.
        </p>
      </header>

      <OnboardingPath />



      <ul className="space-y-5">
        {categories.map((category) => {
          const items = articles.filter((a) => a.category_id === category.id);
          const read = items.filter((a) => readIds.has(a.id)).length;
          return (
            <li key={category.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      tintFor(category.accent),
                    )}
                  >
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} artículos · {read} leídos
                  </span>
                </div>
                <h2 className="mt-3 font-display text-2xl">
                  <Link to="/category/$slug" params={{ slug: category.slug }} className="hover:underline">
                    {category.title}
                  </Link>
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{category.summary}</p>

                <div className="mt-5 rounded-xl bg-paper p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Target className="size-3.5" aria-hidden />
                    Objetivos de esta sección
                  </p>
                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {category.objectives.map((objective) => (
                      <li key={objective} className="flex gap-2 text-sm">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                >
                  Ver los artículos <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
