import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sugerencias")({
  head: () => ({
    meta: [
      { title: "Buzón de sugerencias — Portal del Estudio Mansilla Garzón & Asoc." },
      {
        name: "description",
        content:
          "Aportá ideas de mejora sobre clima laboral, herramientas y procesos del estudio. Supervisión lee y responde.",
      },
      { property: "og:title", content: "Buzón de sugerencias — Mansilla Garzón & Asoc." },
      { property: "og:description", content: "Ideas de mejora del equipo, con seguimiento de Supervisión." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sugerencias,
});

const TOPICS = [
  { value: "clima", label: "Clima laboral" },
  { value: "herramientas", label: "Herramientas y sistemas" },
  { value: "procesos", label: "Procesos y gestión" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "general", label: "Otro" },
] as const;

const suggestionsQuery = {
  queryKey: ["suggestions"] as const,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data ?? [];
  },
};

function Sugerencias() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(suggestionsQuery);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);

  const [topic, setTopic] = useState<string>("procesos");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (body.trim().length < 10) {
      toast.error("Contanos un poco más sobre tu idea");
      return;
    }
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setSending(false);
      toast.error("Tu sesión expiró, volvé a ingresar");
      return;
    }
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
    const { error } = await supabase.from("suggestions").insert({
      user_id: uid,
      author_name: anonymous ? null : (p?.full_name ?? null),
      topic,
      body: body.trim(),
      anonymous,
    });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar la sugerencia");
      return;
    }
    setBody("");
    setAnonymous(false);
    qc.invalidateQueries({ queryKey: ["suggestions"] });
    toast.success("¡Gracias! Tu sugerencia llegó a Supervisión");
  };

  const markRead = async (id: string) => {
    await supabase.from("suggestions").update({ status: "leida" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["suggestions"] });
  };

  return (
    <div className="space-y-8">
      <section className="ink-panel rise-in p-7 md:p-9">
        <p className="inline-flex items-center gap-2 rounded-full bg-ink-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
          <Lightbulb className="size-3.5" aria-hidden /> Buzón digital
        </p>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">Tu idea mejora el estudio</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-foreground/75 md:text-base">
          Proponé mejoras sobre el clima de trabajo, las herramientas o los procesos. Podés enviarla
          con tu nombre o de forma anónima.
        </p>
      </section>

      <section className="surface p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
          <div>
            <label className="text-sm font-medium" htmlFor="topic">
              Tema
            </label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              Enviar de forma anónima
            </label>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="body">
              Tu sugerencia
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Ej.: Sumar un recordatorio automático dos días antes del vencimiento de cada acuerdo."
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={send} disabled={sending}>
                <Send className="size-4" aria-hidden /> Enviar sugerencia
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">{editor ? "Sugerencias recibidas" : "Mis sugerencias"}</h2>
        <ul className="mt-4 space-y-3 stagger-children">
          {items.length === 0 && (
            <li className="text-sm text-muted-foreground">
              {editor ? "Todavía no hay sugerencias." : "Todavía no enviaste ninguna sugerencia."}
            </li>
          )}
          {items.map((s) => (
            <li
              key={s.id}
              className={cn("surface surface-lift p-4", s.status === "leida" && "opacity-70")}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {TOPICS.find((t) => t.value === s.topic)?.label ?? s.topic}
                </span>
                {s.status === "leida" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-n3 px-2 py-0.5 text-xs font-semibold text-n3-foreground">
                    <CheckCircle2 className="size-3" aria-hidden /> Leída
                  </span>
                )}
                {editor && s.status !== "leida" && (
                  <button
                    onClick={() => markRead(s.id)}
                    className="ml-auto text-xs font-semibold text-primary hover:underline"
                  >
                    Marcar como leída
                  </button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{s.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {s.anonymous ? "Anónimo" : (s.author_name ?? "Sin nombre")} ·{" "}
                {new Date(s.created_at).toLocaleDateString("es-AR")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
