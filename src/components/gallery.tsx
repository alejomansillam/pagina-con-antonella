import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { myRolesQuery, canEdit } from "@/lib/roles";

type Photo = {
  id: string;
  url: string;
  caption: string;
  author_id: string | null;
  author_name: string;
  created_at: string;
};

const BUCKET = "gallery";

async function signedUrl(path: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 30);
  return data?.signedUrl ?? "";
}

export const galleryQuery = {
  queryKey: ["gallery_photos"] as const,
  queryFn: async (): Promise<(Photo & { src: string })[]> => {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("id, url, caption, author_id, author_name, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    const rows = (data ?? []) as Photo[];
    return Promise.all(rows.map(async (p) => ({ ...p, src: await signedUrl(p.url) })));
  },
};

export function Gallery() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const { data: photos = [] } = useQuery(galleryQuery);
  const { data: roles = [] } = useQuery(myRolesQuery);
  const editor = canEdit(roles);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo tiene que ser una imagen");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sesión no disponible");
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("gallery_photos").insert({
        url: path,
        caption: caption.trim(),
        author_id: uid,
        author_name: prof?.full_name ?? "",
      });
      if (insErr) throw insErr;
      setCaption("");
      toast.success("Foto publicada en la galería");
      qc.invalidateQueries({ queryKey: ["gallery_photos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(photo: Photo) {
    const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
    if (error) {
      toast.error("No se pudo eliminar la foto");
      return;
    }
    await supabase.storage.from(BUCKET).remove([photo.url]);
    toast.success("Foto eliminada");
    qc.invalidateQueries({ queryKey: ["gallery_photos"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Pie de foto (opcional): desayuno de equipo, cierre de mes…"
          className="max-w-sm"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" /> {uploading ? "Subiendo…" : "Subir foto"}
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="size-4" aria-hidden /> Todavía no hay fotos. ¡Subí la primera del equipo!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-xl border border-border bg-secondary/40">
              {p.src ? (
                <img src={p.src} alt={p.caption || "Foto del equipo"} className="aspect-square w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid aspect-square place-items-center text-muted-foreground">
                  <Camera className="size-6" aria-hidden />
                </div>
              )}
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white">
                {p.caption && <p className="font-medium">{p.caption}</p>}
                <p className="opacity-80">
                  {p.author_name} · {new Date(p.created_at).toLocaleDateString("es-AR")}
                </p>
              </figcaption>
              {editor && (
                <button
                  type="button"
                  onClick={() => void remove(p)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Eliminar foto"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
