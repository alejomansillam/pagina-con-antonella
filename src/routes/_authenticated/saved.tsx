import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookmarkX, Clock, ExternalLink } from "lucide-react";

import { articlesQuery, bookmarksQuery, categoriesQuery, tintFor } from "@/lib/kb";
import { BookmarkButton } from "@/components/bookmark-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Artículos guardados — Portal del Estudio · Mansilla Garzón" },
      {
        name: "description",
        content: "Todos los artículos de onboarding que marcaste para volver a leer, del más reciente al primero.",
      },
      { property: "og:title", content: "Artículos guardados — Portal del Estudio · Mansilla Garzón" },
      { property: "og:description", content: "Tu lista personal de artículos guardados del portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { data: bookmarks = [], isLoading } = useQuery(bookmarksQuery);
  const { data: articles = [] } = useQuery(articlesQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const saved = bookmarks
    .map((bookmark) => articles.find((a) => a.id === bookmark.article_id))
    .filter((a): a is (typeof articles)[number] => Boolean(a));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl md:text-4xl">Guardados</h1>
        <p className="mt-2 text-muted-foreground">
          Lo que marcaste para volver a leer, del más reciente al primero.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tus guardados…</p>
      ) : saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <BookmarkX className="mx-auto size-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-semibold">Todavía no guardaste nada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa el ícono de marcador en cualquier artículo para tenerlo a mano acá.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/browse">Explorar secciones</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {saved.map((article) => {
            const category = categories.find((c) => c.id === article.category_id);
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
                    {category && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[0.68rem] font-semibold",
                          tintFor(category.accent),
                        )}
                      >
                        {category.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden /> {article.reading_minutes} min
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
