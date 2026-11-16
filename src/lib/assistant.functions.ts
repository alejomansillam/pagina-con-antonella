import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Asistente del portal con Claude (Anthropic). Requiere ANTHROPIC_API_KEY en Vercel.
const MODEL = "claude-haiku-5-5";
const MAX_ARTICLE_CHARS = 6000;

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ threadId: z.string().uuid(), message: z.string().trim().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: thread, error: tErr } = await sb
      .from("assistant_threads").select("id, title").eq("id", data.threadId).maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!thread) throw new Error("Conversación no encontrada");

    const { error: uErr } = await sb.from("assistant_messages")
      .insert({ thread_id: data.threadId, role: "user", content: data.message });
    if (uErr) throw new Error(uErr.message);

    const [{ data: history }, { data: articles }] = await Promise.all([
      sb.from("assistant_messages").select("role, content").eq("thread_id", data.threadId).order("created_at"),
      sb.from("articles").select("slug, title, summary, body").order("position"),
    ]);

    const docs = (articles ?? [])
      .map((a) => `### ${a.title} (enlace: /article/${a.slug})\n${a.summary ?? ""}\n${(a.body ?? "").slice(0, MAX_ARTICLE_CHARS)}`)
      .join("\n\n");

    const instructions = `Sos el Asistente del Portal del Estudio Mansilla Garzón & Asoc. Respondés en español rioplatense, con tono profesional, claro y breve.
Respondé SOLO con la información de los manuales y documentación del portal que siguen. Si algo no está en la documentación, decilo y sugerí consultar a un Senior. No inventes montos, porcentajes, plazos ni datos de deudores. Cuando sea útil, citá el manual con un enlace markdown a su ruta (por ejemplo [Manual](/article/slug)).

DOCUMENTACIÓN DEL PORTAL:
${docs}`;

    const answer =
      (await askClaude(instructions, (history ?? []) as Message[])).trim() ||
      "No pude generar una respuesta. Probá reformular la pregunta.";

    const { error: aErr } = await sb.from("assistant_messages")
      .insert({ thread_id: data.threadId, role: "assistant", content: answer });
    if (aErr) throw new Error(aErr.message);

    const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
    if (thread.title === "Nueva conversación") patch.title = data.message.slice(0, 60);
    await sb.from("assistant_threads").update(patch).eq("id", data.threadId);

    return { answer };
  });

type Message = { role: "user" | "assistant"; content: string };

async function askClaude(system: string, messages: Message[]): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("El asistente todavía no está configurado (falta ANTHROPIC_API_KEY).");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages }),
  });
  if (res.status === 429) throw new Error("Hay muchas consultas en este momento. Probá de nuevo en un rato.");
  if (!res.ok) {
    console.error("assistant error", res.status, await res.text());
    throw new Error("El asistente no está disponible ahora. Probá de nuevo.");
  }
  const body = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}
