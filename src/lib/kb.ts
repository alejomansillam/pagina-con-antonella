import { supabase } from "@/integrations/supabase/client";
import { GUIDE_ARTICLE_SLUG, GUIDE_BODY, GUIDE_SUMMARY, GUIDE_TITLE } from "@/lib/portal-guide";

export type Category = {
  id: string;
  slug: string;
  name: string;
  title: string;
  summary: string;
  objectives: string[];
  accent: string;
  position: number;
};

export type Article = {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  reading_minutes: number;
  is_required: boolean;
  position: number;
  external_url: string | null;
  external_label: string | null;
  is_tool: boolean;
  resources: { label: string; url: string }[];
};

export const CATEGORY_TINTS: Record<string, string> = {
  amber: "bg-[oklch(0.94_0.06_75)] text-[oklch(0.35_0.08_60)]",
  rose: "bg-[oklch(0.93_0.05_15)] text-[oklch(0.38_0.1_15)]",
  sky: "bg-[oklch(0.93_0.05_240)] text-[oklch(0.38_0.09_250)]",
  emerald: "bg-[oklch(0.93_0.05_160)] text-[oklch(0.36_0.08_165)]",
  violet: "bg-[oklch(0.93_0.05_300)] text-[oklch(0.38_0.09_300)]",
};

export function tintFor(_accent: string) {
  // Etiquetas monocromáticas neutras: todas iguales, se distinguen por el texto.
  return "border border-border bg-foreground/[0.06] text-muted-foreground uppercase tracking-[0.12em]";
}

export const categoriesQuery = {
  queryKey: ["categories"] as const,
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name, title, summary, objectives, accent, position")
      .order("position");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
};

export const articlesQuery = {
  queryKey: ["articles"] as const,
  queryFn: async (): Promise<Article[]> => {
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, category_id, slug, title, summary, body, reading_minutes, is_required, position, external_url, external_label, is_tool, resources",
      )
      .order("position");
    if (error) throw error;
    return ((data ?? []) as Article[]).map((article) => article.slug === GUIDE_ARTICLE_SLUG
      ? { ...article, title: GUIDE_TITLE, summary: GUIDE_SUMMARY, body: GUIDE_BODY }
      : article);
  },
};

export const bookmarksQuery = {
  queryKey: ["bookmarks"] as const,
  queryFn: async (): Promise<{ article_id: string; created_at: string }[]> => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("article_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export const progressQuery = {
  queryKey: ["reading_progress"] as const,
  queryFn: async (): Promise<{ article_id: string; completed_at: string }[]> => {
    const { data, error } = await supabase
      .from("reading_progress")
      .select("article_id, completed_at");
    if (error) throw error;
    return data ?? [];
  },
};

export const profileQuery = {
  queryKey: ["profile"] as const,
  queryFn: async (): Promise<{ full_name: string; department: string | null } | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, department")
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
};

export async function toggleBookmark(articleId: string, isSaved: boolean) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sesión no disponible");

  if (isSaved) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", uid)
      .eq("article_id", articleId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: uid, article_id: articleId });
  if (error) throw error;
  return true;
}

export async function setRead(articleId: string, read: boolean) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sesión no disponible");

  if (!read) {
    const { error } = await supabase
      .from("reading_progress")
      .delete()
      .eq("user_id", uid)
      .eq("article_id", articleId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("reading_progress")
    .upsert({ user_id: uid, article_id: articleId }, { onConflict: "user_id,article_id" });
  if (error) throw error;
  return true;
}

export function searchArticles(articles: Article[], term: string) {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  const scored = articles
    .map((article) => {
      const haystack = `${article.title} ${article.summary} ${article.body}`.toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return null;
      const titleHit = article.title.toLowerCase().includes(q) ? 0 : 1;
      const summaryHit = article.summary.toLowerCase().includes(q) ? 0 : 1;
      return { article, score: titleHit * 2 + summaryHit };
    })
    .filter((x): x is { article: Article; score: number } => x !== null)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, 8).map((s) => s.article);
}
