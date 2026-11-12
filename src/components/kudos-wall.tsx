import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { staffDirectoryQuery } from "@/lib/staff";

const kudosQuery = {
  queryKey: ["kudos"] as const,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("kudos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  },
};

export function KudosWall() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(kudosQuery);
  const { data: staff = [] } = useQuery(staffDirectoryQuery);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to.trim() || !message.trim()) {
      toast.error("Elegí a quién y escribí el reconocimiento");
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
    const { error } = await supabase.from("kudos").insert({
      from_user_id: uid,
      from_name: p?.full_name ?? "Un compañero",
      to_name: to.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar el reconocimiento");
      return;
    }
    setTo("");
    setMessage("");
    qc.invalidateQueries({ queryKey: ["kudos"] });
    toast.success("¡Reconocimiento enviado!");
  };

  const remove = async (id: string) => {
    await supabase.from("kudos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["kudos"] });
  };

  return (
    <section className="surface p-5">
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Heart className="size-5 text-primary" aria-hidden /> Reconocimientos del equipo
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Mandale una mención de agradecimiento o felicitación a un compañero.
      </p>

      <div className="mt-4 space-y-2 rounded-xl bg-secondary p-3">
        <input
          list="staff-names"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="¿Para quién? (nombre del compañero)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <datalist id="staff-names">
          {staff.map((s) => (
            <option key={s.id} value={s.full_name} />
          ))}
        </datalist>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Ej.: Gracias por cubrir la cartera N1 el viernes, cerraste tres acuerdos difíciles."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={send} disabled={sending}>
            <Send className="size-4" aria-hidden /> Enviar
          </Button>
        </div>
      </div>

      <ul className="mt-4 grid gap-3 stagger-children sm:grid-cols-2">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">Todavía no hay reconocimientos. Estrená el muro.</li>
        )}
        {items.map((k) => (
          <li key={k.id} className="surface surface-lift p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">
                Para <span className="text-primary">{k.to_name}</span>
              </p>
              <button
                onClick={() => remove(k.id)}
                aria-label="Borrar reconocimiento"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-sm">{k.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {k.from_name || "Un compañero"} · {new Date(k.created_at).toLocaleDateString("es-AR")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
