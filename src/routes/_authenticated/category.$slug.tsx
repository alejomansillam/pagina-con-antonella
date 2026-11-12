import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock, ExternalLink, Target } from "lucide-react";

import { articlesQuery, categoriesQuery, progressQuery, tintFor } from "@/lib/kb";
import { BookmarkButton } from "@/components/bookmark-button";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/category/$slug")({
  head: () => ({
    meta: [
      { title: "Sección de onboarding — Portal del Estudio · Mansilla Garzón" },
      {
        name: "description",
        content:
          "Objetivos de aprendizaje y artículos de esta sección de la base de conocimiento de onboarding.",
      },
      { property: "og:title", content: "Sección de onboarding — Portal del Estudio · Mansilla Garzón" },
      { property: "og:description", content: "Objetivos de la sección y todos sus artículos." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoryPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-destructive">
      {error instanceof Error ? error.message : "Error"}
    </p>
  ),
  notFoundComponent: () => <p>Esta sección no existe.</p>,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: categories = [], isLoading } = useQuery(categoriesQuery);
  const { data: articles = [] } = useQuery(articlesQuery);
  const { data: progress = [] } = useQuery(progressQuery);

  const category = categories.find((c) => c.slug === slug);
  const readIds = new Set(progress.map((p) => p.article_id));

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando sección…</p>;
  if (!category) return <p className="text-sm text-muted-foreground">Esta sección no existe.</p>;

  const items = articles.filter((a) => a.category_id === category.id);
  const required = items.filter((a) => a.is_required);
  const read = required.filter((a) => readIds.has(a.id)).length;
  const pct = required.length ? Math.round((read / required.length) * 100) : 0;

  return (
    <article className="space-y-8">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Todas las secciones
      </Link>

      <header>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tintFor(category.accent))}>
          {category.name}
        </span>
        <h1 className="mt-3 max-w-3xl font-display text-3xl md:text-4xl">{category.title}</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">{category.summary}</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="size-3.5" aria-hidden />
            Al terminar esta sección deberías poder
          </p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {category.objectives.map((objective) => (
              <li key={objective} className="flex gap-2 text-sm">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
          {required.length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-muted-foreground">
                Lectura obligatoria: {read} de {required.length}
              </p>
              <Progress value={pct} className="mt-2 h-1.5" />
            </div>
          )}
        </div>
      </header>

      <ul className="space-y-3">
        {items.map((article) => {
          const isRead = readIds.has(article.id);
          return (
            <li
              key={article.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/article/$slug"
                    params={{ slug: article.slug }}
                    className="font-semibold hover:underline"
                  >
                    {article.title}
                  </Link>
                  {isRead && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[0.68rem] font-semibold text-secondary-foreground">
                      <Check className="size-3" aria-hidden /> Leído
                    </span>
                  )}
                  {!article.is_required && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[0.68rem] text-muted-foreground">
                      Complementario
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden /> {article.reading_minutes} min de lectura
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {article.external_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={article.external_url} target="_blank" rel="noreferrer noopener">
                      {article.external_label ?? "Abrir"} <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                )}
                <BookmarkButton articleId={article.id} />
                <Button asChild size="sm">
                  <Link to="/article/$slug" params={{ slug: article.slug }}>
                    Leer
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
