import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { myRolesQuery, type Role } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/accesos")({
  head: () => ({
    meta: [
      { title: "Accesos y permisos — Mansilla Garzón & Asoc." },
      { name: "description", content: "Administración de permisos de Seniors y administradores del portal." },
      { property: "og:title", content: "Accesos y permisos" },
      { property: "og:description", content: "Quién puede editar el portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Accesos,
});

const LEVELS: { role: Role; label: string; help: string }[] = [
  { role: "senior", label: "Senior / Supervisión", help: "Actualiza padrones y publica avisos" },
  { role: "admin", label: "Administrador", help: "Además asigna permisos" },
];

function Accesos() {
  const qc = useQueryClient();
  const { data: mine = [] } = useQuery(myRolesQuery);
  const { data } = useQuery({
    queryKey: ["all_roles"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, full_name, role_title").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return { people: p.data ?? [], roles: r.data ?? [] };
    },
  });

  if (!mine.includes("admin"))
    return <p className="text-muted-foreground">Solo los administradores pueden gestionar los accesos.</p>;

  const has = (uid: string, role: Role) => data?.roles.some((r) => r.user_id === uid && r.role === role);
  const toggle = async (uid: string, role: Role) => {
    const res = has(uid, role)
      ? await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: uid, role });
    if (res.error) { toast.error("No se pudo cambiar el permiso"); return; }
    qc.invalidateQueries({ queryKey: ["all_roles"] });
    toast.success("Permiso actualizado");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Accesos y permisos</h1>
        <p className="mt-2 text-muted-foreground">
          Por defecto todos son gestores: consultan todo pero no editan. Marcá quién tiene acceso ampliado. Las personas aparecen acá cuando crean su cuenta.
        </p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="p-3">Persona</th>
              {LEVELS.map((l) => (
                <th key={l.role} className="p-3">{l.label}<span className="block text-xs font-normal text-muted-foreground">{l.help}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.people.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.full_name || "Sin nombre"}<span className="block text-xs text-muted-foreground">{p.role_title}</span></td>
                {LEVELS.map((l) => (
                  <td key={l.role} className="p-3">
                    <input type="checkbox" className="size-4" checked={!!has(p.id, l.role)} onChange={() => toggle(p.id, l.role)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
