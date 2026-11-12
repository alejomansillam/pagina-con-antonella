import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/** Contenido editable desde el portal guardado en editable_sections.points (JSON). */
export const contentQuery = <T,>(key: string) => ({
  queryKey: ["editable_content", key] as const,
  queryFn: async (): Promise<T | null> => {
    const { data, error } = await supabase
      .from("editable_sections")
      .select("points")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return (data?.points as T | undefined) ?? null;
  },
});

export async function saveContent(key: string, title: string, value: unknown) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("editable_sections").upsert({
    key,
    title,
    body: "",
    points: value as Json,
    links: [] as Json,
    updated_by: u.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
