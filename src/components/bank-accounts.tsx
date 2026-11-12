import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Landmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { canEdit, myRolesQuery } from "@/lib/roles";
import { Button } from "@/components/ui/button";

const copy = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado al portapapeles`);
};

export function BankAccounts() {
  const qc = useQueryClient();
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const { data: accounts = [] } = useQuery({
    queryKey: ["bank_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").order("position");
      if (error) throw error;
      return data;
    },
  });
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ bank: "", holder: "", cbu: "", alias: "" });

  const add = async () => {
    if (!f.bank.trim()) { toast.error("Completá el banco"); return; }
    const { error } = await supabase.from("bank_accounts").insert({
      bank: f.bank.trim(),
      holder: f.holder.trim(),
      cbu: f.cbu.trim() || null,
      alias: f.alias.trim() || null,
      position: accounts.length + 1,
    });
    if (error) { toast.error("No se pudo guardar"); return; }
    setF({ bank: "", holder: "", cbu: "", alias: "" });
    setAdding(false);
    qc.invalidateQueries({ queryKey: ["bank_accounts"] });
  };

  const remove = async (id: string) => {
    if (!confirm("¿Borrar esta cuenta?")) return;
    await supabase.from("bank_accounts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["bank_accounts"] });
  };

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <Landmark className="size-5 text-primary" aria-hidden /> Cuentas oficiales de recaudación
        </h2>
        {editor && (
          <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
            <Plus className="size-4" /> Agregar cuenta
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Pasá siempre estos datos. Nunca cuentas personales.</p>

      {adding && (
        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-paper p-3 sm:grid-cols-2">
          {(["bank", "holder", "cbu", "alias"] as const).map((k) => (
            <input
              key={k}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
              placeholder={{ bank: "Banco", holder: "Titular", cbu: "CBU", alias: "Alias" }[k]}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          ))}
          <Button size="sm" className="sm:col-span-2 sm:justify-self-start" onClick={add}>Guardar</Button>
        </div>
      )}

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {accounts.map((a) => (
          <li key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.bank}</p>
                <p className="text-xs text-muted-foreground">{a.holder}</p>
              </div>
              {editor && (
                <button type="button" onClick={() => remove(a.id)} aria-label="Borrar cuenta" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              {a.cbu && (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">CBU</dt>
                    <dd className="break-all font-mono">{a.cbu}</dd>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => copy(a.cbu!, "CBU")}>
                    <Copy className="size-3.5" /> Copiar CBU
                  </Button>
                </div>
              )}
              {a.alias && (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Alias</dt>
                    <dd className="font-mono">{a.alias}</dd>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => copy(a.alias!, "Alias")}>
                    <Copy className="size-3.5" /> Copiar Alias
                  </Button>
                </div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
