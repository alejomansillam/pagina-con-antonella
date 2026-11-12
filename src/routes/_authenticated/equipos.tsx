import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Save, Users, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/equipos")({
  head: () => ({
    meta: [
      { title: "Equipos de gestión — Mansilla Garzón & Asoc." },
      { name: "description", content: "Conformación de los equipos Rojo, Verde, Azul y 1142 con su senior a cargo." },
      { property: "og:title", content: "Equipos de gestión" },
      { property: "og:description", content: "Quién integra cada equipo del estudio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Equipos,
});

type Team = { id: string; name: string; leader: string | null; description: string; members: string[] };

const teamsQuery = {
  queryKey: ["teams"] as const,
  queryFn: async (): Promise<Team[]> => {
    const { data, error } = await supabase.from("teams").select("id,name,leader,description,members").order("position");
    if (error) throw error;
    return data ?? [];
  },
};

function Equipos() {
  const { data: teams = [] } = useQuery(teamsQuery);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Equipo</p>
        <h1 className="mt-1 font-display text-3xl">Equipos de gestión</h1>
        <p className="mt-2 text-muted-foreground">
          Cada senior conduce su equipo. {editor ? "Podés editar la conformación de cada equipo." : "Solo Seniors y Supervisión pueden editar."}
        </p>
      </header>
      <div className="grid gap-4 stagger-children md:grid-cols-2">
        {teams.map((t) => <TeamCard key={t.id} team={t} editor={editor} />)}
      </div>
    </div>
  );
}

function TeamCard({ team, editor }: { team: Team; editor: boolean }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [leader, setLeader] = useState(team.leader ?? "");
  const [desc, setDesc] = useState(team.description);
  const [members, setMembers] = useState(team.members.join("\n"));

  async function save() {
    const { error } = await supabase.from("teams").update({
      leader: leader.trim() || null,
      description: desc.trim(),
      members: members.split("\n").map((m) => m.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    }).eq("id", team.id);
    if (error) { toast.error("No se pudo guardar"); return; }
    toast.success("Equipo actualizado");
    setEdit(false);
    qc.invalidateQueries({ queryKey: ["teams"] });
  }

  return (
    <article className="surface surface-lift p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Users className="mr-1 inline size-3.5" aria-hidden /> {team.members.length} integrantes
          </p>
          <h2 className="mt-1 font-display text-xl">{team.name}</h2>
        </div>
        {editor && !edit && (
          <Button size="sm" variant="ghost" onClick={() => setEdit(true)} aria-label="Editar equipo"><Pencil className="size-4" /></Button>
        )}
      </div>
      {edit ? (
        <div className="mt-3 space-y-2">
          <input value={leader} onChange={(e) => setLeader(e.target.value)} placeholder="Senior a cargo" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción / cartera" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
          <textarea value={members} onChange={(e) => setMembers(e.target.value)} rows={6} placeholder="Un integrante por línea" className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Save className="size-4" /> Guardar</Button>
            <Button size="sm" variant="outline" onClick={() => setEdit(false)}><X className="size-4" /> Cancelar</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm"><span className="text-muted-foreground">Senior a cargo:</span> <strong>{team.leader || "—"}</strong></p>
          {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {team.members.length === 0 ? (
              <li className="text-sm text-muted-foreground">Sin integrantes cargados.</li>
            ) : team.members.map((m) => (
              <li key={m} className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs">{m}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
