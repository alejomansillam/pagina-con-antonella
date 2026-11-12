import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

import { bookmarksQuery, toggleBookmark } from "@/lib/kb";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  articleId,
  withLabel = false,
  className,
}: {
  articleId: string;
  withLabel?: boolean;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { data: bookmarks = [] } = useQuery(bookmarksQuery);
  const isSaved = bookmarks.some((b) => b.article_id === articleId);

  const mutation = useMutation({
    mutationFn: () => toggleBookmark(articleId, isSaved),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: bookmarksQuery.queryKey });
      toast.success(saved ? "Guardado en tus artículos" : "Quitado de guardados");
    },
    onError: () => toast.error("No pudimos actualizar tus guardados. Intenta de nuevo."),
  });

  return (
    <button
      type="button"
      aria-label={isSaved ? "Quitar de guardados" : "Guardar artículo"}
      aria-pressed={isSaved}
      disabled={mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors",
        isSaved
          ? "border-transparent bg-accent text-accent-foreground"
          : "bg-card text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {isSaved ? <BookmarkCheck className="size-4" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
      {withLabel && <span>{isSaved ? "Guardado" : "Guardar"}</span>}
    </button>
  );
}
