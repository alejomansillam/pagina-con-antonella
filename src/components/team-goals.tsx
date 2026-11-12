import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

type Team = { id: string; name: string; leader: string | null; monthly_goal: number; recovered: number };

export function TeamGoals() {
  const qc = useQueryClient();
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", "goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id,name,leader,monthly_goal,recovered")
        .order("position");
      if (error) throw error;
      return data as Team[];
    },
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [rec, setRec] = useState("");

  const ranked = [...teams].sort((a, b) => pct(b) - pct(a));

  const save = async (id: string) => {
    const { error } = await supabase
      .from("teams")
      .update({ monthly_goal: Number(goal) || 0, recovered: Number(rec) || 0 })
      .eq("id", id);
    if (error) { toast.error("No se pudo guardar"); return; }
    toast.success("Montos actualizados");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  return (
    <section className="surface p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <Trophy className="size-5 text-primary" aria-hidden /> Metas de recupero por escuadra
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Ranking del mes según el porcentaje de la meta alcanzado.</p>
      <ol className="mt-5 grid gap-4 md:grid-cols-2">
        {ranked.map((t, i) => (
          <li key={t.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-secondary font-display text-sm font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  {t.leader && <p className="text-xs text-muted-foreground">{t.leader}</p>}
                </div>
              </div>
              <span className="font-display text-2xl font-bold">{pct(t)}%</span>
            </div>
            <Progress value={Math.min(pct(t), 100)} className="mt-4" />
            <p className="mt-2 text-sm">
              <span className="font-semibold">{money(t.recovered)}</span>
              <span className="text-muted-foreground"> de {money(t.monthly_goal)}</span>
            </p>
            {editor &&
              (editing === t.id ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Meta mensual
                    <input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Recuperado
                    <input type="number" value={rec} onChange={(e) => setRec(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button size="sm" onClick={() => save(t.id)}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setEditing(t.id);
                    setGoal(String(t.monthly_goal));
                    setRec(String(t.recovered));
                  }}
                >
                  <Pencil className="size-3.5" /> Actualizar montos
                </Button>
              ))}
          </li>
        ))}
      </ol>
    </section>
  );
}

function pct(t: Team) {
  return t.monthly_goal > 0 ? Math.round((Number(t.recovered) / Number(t.monthly_goal)) * 100) : 0;
}
