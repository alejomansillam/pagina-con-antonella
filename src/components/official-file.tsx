import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, FileText } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { myRolesQuery, canEdit } from "@/lib/roles";

const BUCKET = "official-files";

export function OfficialFile({ fileKey, title, downloadLabel, prominent }: { fileKey: string; title: string; downloadLabel?: string; prominent?: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);
  const { data: file } = useQuery({
    queryKey: ["official_file", fileKey],
    queryFn: async () => {
      const { data, error } = await supabase.from("official_files").select("*").eq("key", fileKey).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const open = async (download: boolean) => {
    if (!file) return;
    const { data, error } = await supabase.storage.from(BUCKET).download(file.file_path);
    if (error || !data) { toast.error("No se pudo abrir el archivo"); return; }
    const url = URL.createObjectURL(data);
    if (download) {
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      a.click();
    } else window.open(url, "_blank");
  };

  const upload = async (f: File) => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const path = `${fileKey}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const up = await supabase.storage.from(BUCKET).upload(path, f, f.type ? { contentType: f.type } : {});
    if (up.error) { setBusy(false); { toast.error("Error al subir: " + up.error.message); return; } }
    const { error } = await supabase.from("official_files").upsert({
      key: fileKey, file_path: path, file_name: f.name,
      updated_by: u.user?.id ?? null, updated_by_name: u.user?.email ?? null, updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) { toast.error("Error al guardar: " + error.message); return; }
    toast.success("Archivo oficial reemplazado");
    qc.invalidateQueries({ queryKey: ["official_file", fileKey] });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 print:hidden">
      <h2 className="font-display text-xl">{title}</h2>
      {file ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <FileText className="size-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{file.file_name}</p>
            <p className="text-xs text-muted-foreground">Actualizado {new Date(file.updated_at).toLocaleDateString("es-AR")}{file.updated_by_name ? ` · ${file.updated_by_name}` : ""}</p>
          </div>
          {prominent ? (
            <Button size="lg" className="w-full sm:w-auto" onClick={() => open(true)}>
              <Download className="size-4" /> {downloadLabel ?? "Descargar"}
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => open(false)}>Abrir</Button>
              <Button size="sm" variant="outline" onClick={() => open(true)}><Download className="size-4" /> Descargar</Button>
            </>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Todavía no hay archivo oficial cargado.</p>
      )}
      {editor && (
        <>
          <input ref={input} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <Button className="mt-4" size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
            <FileUp className="size-4" /> {busy ? "Subiendo…" : file ? "Reemplazar archivo oficial" : "Subir archivo oficial"}
          </Button>
        </>
      )}
    </section>
  );
}
