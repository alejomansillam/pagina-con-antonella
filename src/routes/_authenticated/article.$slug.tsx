import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { articlesQuery, categoriesQuery, progressQuery, setRead, tintFor } from "@/lib/kb";
import { ArticleBody } from "@/components/article-body";
import { PortalGuideSteps } from "@/components/portal-guide-steps";
import { GUIDE_ARTICLE_SLUG } from "@/lib/portal-guide";
import { MANUAL_QUIZZES } from "@/lib/manual-quiz";
import { ManualQuiz } from "@/components/manual-quiz";
import { ManualEditor } from "@/components/manual-editor";
import { contentQuery } from "@/lib/editable-content";
import type { QuizQuestion } from "@/lib/manual-quiz";
import { BookmarkButton } from "@/components/bookmark-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/article/$slug")({
  head: () => ({
    meta: [
      { title: "Artículo de onboarding — Portal del Estudio · Mansilla Garzón" },
      {
        name: "description",
        content:
          "Guía de onboarding con pasos, consejos según tu rol y solución de problemas frecuentes.",
      },
      { property: "og:title", content: "Artículo de onboarding — Portal del Estudio · Mansilla Garzón" },
      { property: "og:description", content: "Pasos, consejos por rol y solución de problemas." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArticlePage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-destructive">
      {error instanceof Error ? error.message : "Error"}
    </p>
  ),
  notFoundComponent: () => <p>Este artículo no existe.</p>,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: articles = [], isLoading } = useQuery(articlesQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: progress = [] } = useQuery(progressQuery);
  const { data: savedQuiz } = useQuery(contentQuery<QuizQuestion[]>(`quiz:${slug}`));
  const quiz = savedQuiz ?? MANUAL_QUIZZES[slug] ?? [];

  const article = articles.find((a) => a.slug === slug);
  const category = categories.find((c) => c.id === article?.category_id);
  const isRead = article ? progress.some((p) => p.article_id === article.id) : false;

  const toggleRead = useMutation({
    mutationFn: () => {
      if (!article) throw new Error("Artículo no disponible");
      return setRead(article.id, !isRead);
    },
    onSuccess: (read) => {
      queryClient.invalidateQueries({ queryKey: progressQuery.queryKey });
      toast.success(read ? "Marcado como leído" : "Marcado como pendiente");
    },
    onError: () => toast.error("No pudimos actualizar tu checklist. Intenta de nuevo."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando artículo…</p>;
  if (!article) return <p className="text-sm text-muted-foreground">Este artículo no existe.</p>;

  const siblings = articles
    .filter((a) => a.category_id === article.category_id)
    .sort((a, b) => a.position - b.position);
  const index = siblings.findIndex((a) => a.id === article.id);
  const prev = index > 0 ? siblings[index - 1] : undefined;
  const next = index < siblings.length - 1 ? siblings[index + 1] : undefined;

  return (
    <article className="mx-auto max-w-3xl">
      {category && (
        <Link
          to="/category/$slug"
          params={{ slug: category.slug }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {category.name}
        </Link>
      )}

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tintFor(category.accent))}>
              {category.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> {article.reading_minutes} min
          </span>
          {!article.is_required && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.68rem] text-muted-foreground">
              Complementario
            </span>
          )}
        </div>
        <h1 className="mt-4 font-display text-3xl leading-tight md:text-4xl">{article.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{article.summary}</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {article.external_url && (
            <Button asChild>
              <a href={article.external_url} target="_blank" rel="noreferrer noopener">
                {article.external_label ?? "Abrir herramienta"}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            </Button>
          )}
          {article.resources?.map((resource) => (
            <Button key={resource.url} variant="outline" asChild>
              <a href={resource.url} target="_blank" rel="noreferrer noopener">
                {resource.label}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            </Button>
          ))}
          <Button
            variant={isRead ? "secondary" : "outline"}
            onClick={() => toggleRead.mutate()}
            disabled={toggleRead.isPending}
          >
            <Check className="size-4" aria-hidden />
            {isRead ? "Leído" : "Marcar como leído"}
          </Button>
          <BookmarkButton articleId={article.id} withLabel />
        </div>
      </header>

      <div className="mt-8 border-t border-border pt-8">
        {slug === GUIDE_ARTICLE_SLUG ? <PortalGuideSteps /> : <ArticleBody body={article.body} />}
      </div>

      {slug !== GUIDE_ARTICLE_SLUG && <div className="mt-6"><ManualEditor key={article.id + article.body.length} article={article} quiz={quiz} /></div>}
      {quiz.length > 0 && <ManualQuiz key={slug + quiz.length} questions={quiz} />}

      <nav className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            to="/article/$slug"
            params={{ slug: prev.slug }}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent"
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowLeft className="size-3.5" aria-hidden /> Anterior
            </span>
            <p className="mt-1 font-semibold">{prev.title}</p>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to="/article/$slug"
            params={{ slug: next.slug }}
            className="rounded-xl border border-border bg-card p-4 text-right transition-colors hover:border-accent sm:col-start-2"
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              Siguiente <ArrowRight className="size-3.5" aria-hidden />
            </span>
            <p className="mt-1 font-semibold">{next.title}</p>
          </Link>
        )}
      </nav>
    </article>
  );
}
