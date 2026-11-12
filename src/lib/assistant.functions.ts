import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "openai/gpt-6-astra" as const;
const MAX_ARTICLE_CHARS = 6000;

function extractText(res: unknown): string {
  const r = res as { output_text?: string; output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  return (r.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && c.text)
    .map((c) => c.text)
    .join("\n");
}

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

    let answer: string;
    try {
      const res = await generateWithModel(instructions, (history ?? []) as { role: "user" | "assistant"; content: string }[]);
      answer = extractText(res).trim() || "No pude generar una respuesta. Probá reformular la pregunta.";
    } catch (e) {
      const { GatewayError, PaymentRequiredError, RateLimitError } = await import("@lovable.dev/ai-gateway");
      if (e instanceof PaymentRequiredError) throw new Error("Se agotaron los créditos de IA del espacio de trabajo.");
      if (e instanceof RateLimitError) throw new Error("Hay muchas consultas en este momento. Probá de nuevo en un rato.");
      if (e instanceof GatewayError) { console.error("assistant gateway error", e.code, e.ids); throw new Error("El asistente no está disponible ahora. Probá de nuevo."); }
      throw e;
    }

    const { error: aErr } = await sb.from("assistant_messages")
      .insert({ thread_id: data.threadId, role: "assistant", content: answer });
    if (aErr) throw new Error(aErr.message);

    const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
    if (thread.title === "Nueva conversación") patch.title = data.message.slice(0, 60);
    await sb.from("assistant_threads").update(patch).eq("id", data.threadId);

    return { answer };
  });

async function generateWithModel(instructions: string, history: { role: "user" | "assistant"; content: string }[]) {
  const { generateResponse } = await import("@lovable.dev/ai-gateway");
  return generateResponse({
    model: MODEL,
    instructions,
    input: history.map((m) => ({ role: m.role, content: m.content })),
  });
}
